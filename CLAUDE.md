# CLAUDE.md — Pretvia

## Project Overview

Pretvia is an emoji-first training log platform for athletes and coaches. Next.js 16 App Router, React 19, TypeScript 5.7, MongoDB, Tailwind CSS. Package manager: **pnpm**.

## Quick Commands

```bash
pnpm dev          # Dev server (Turbopack)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm test         # Unit tests (Vitest)
pnpm e2e:ci       # Cypress E2E (headless, starts dev server)
pnpm seed:test    # Seed test users
```

## Architecture

### Auth Flow
- JWT tokens signed with `AUTH_SECRET` (HS256, 7-day expiry) via `jose`
- Stored in httpOnly `session` cookie
- `middleware.ts` protects `/dashboard/*` routes — verifies JWT, redirects to `/auth` on failure
- `getSession()` in `lib/auth.ts` — server-side session retrieval from cookie
- `createSession()` / `deleteSession()` — manage cookie lifecycle
- Google OAuth: `/api/auth/google` → Google → `/api/auth/google/callback`
- Test accounts (env `TEST_ACCOUNT_EMAILS`) bypass email verification

### API Route Patterns
See `app/api/CLAUDE.md` for full detail. Short version:
- Every protected endpoint: `getSession()` → 401 if missing
- Coach-gated: `canManageGroup(db, userId, groupId)` from `lib/api-auth.ts` → 403
- DB: `const db = await getDb()` — ObjectIds: `safeObjectId(id)` → null if invalid
- Error shape: always `{ error: string }` with appropriate HTTP status

### Database (MongoDB)
Collections: `users`, `groups`, `logs`, `comments`, `checkins`, `announcements`, `invites`, `skippedDays`, `attendance`, `groupMemberships`, `guardianLinks`, `log_reviews`, `comment_reads`, `waitlist`, `pending_signups`, `password_reset_tokens`, `pending_under13_child`, `guardianPendingAthletes`

There is no `tags` collection — tags are derived by aggregating `logs.tags`.

Indexes are declared in `lib/ensure-indexes.ts` (bootstrapped once per process from `getDb()`).

### Key Gotcha: Dual/Overlapping Fields
- **users:** `groupIds` (all memberships) + `activeGroupId` (selected group). The legacy singular `groupId` is no longer written; its last read is in `app/api/groups/[groupId]/invites/route.ts` (see migration M1 below).
- **groups:** `headCoachId` (owner) + `coachIds` (all coaches). The head coach is NOT guaranteed to be in `coachIds` — auth checks must test both (`canManageGroup()` in `lib/api-auth.ts` does). Stored types vary (string vs ObjectId), so compare via `.toString()`.
- **Membership has two sources of truth:** `users.groupIds` (member lists, log visibility — `lib/log-filters.ts`) and the `groupMemberships` collection (roles). `ensureGroupIds()` in `lib/group-actions.ts` patches drift. Keep both in sync when adding/removing members.
- `checkins.headCoachId` actually stores the *creating* coach, not the group's head coach.

### DB Audit Findings (2026-07-01) — open work

Full audit of schemas/indexes/query patterns. Not yet fixed; ordered by priority.

**Bugs**
1. ~~**Assistant-coach account deletion destroys groups they don't own.**~~ **DONE (2026-08-10)** — the cascade in `app/api/auth/account/route.ts` now selects owned groups by `headCoachId` alone and separately `$pull`s the user from `coachIds` everywhere else, so an assistant coach deleting their account leaves the head coach's group (and its invites/checkins/attendance/announcements) intact. Both string and ObjectId forms of the id are matched — the fields store either (see the dual-fields gotcha), and matching only strings would have left an ObjectId-keyed group orphaned by its owner's deletion.
2. ~~**Coach deletion orphans log reviews.**~~ **DONE (2026-08-10)** — `log_reviews` are now deleted by `$or: [{coachId}, {headCoachId}, {logId: {$in}}]`, covering both the current field and the legacy one on older documents.
3. **No unique index on `groups.code`.** `generateUniqueGroupCode()` (`lib/group-actions.ts`) is check-then-insert — duplicate codes possible under concurrency; code lookups are collection scans. Check prod for existing dupes before adding the unique index.
4. **Attendance duplicate-doc race.** `app/api/attendance/route.ts` does findOne-then-insert/update; the `{checkinId, groupId}` index is not unique. Fix: unique index + upsert (dedupe prod first).
5. **`guardianLinks` upsert race + missing index.** Upserted on `{guardianId, athleteId}` with no unique index (3 call sites); also queried by `athleteId` alone with no index.
6. **`canManageGroup()` grants manage rights via mere membership** (`lib/api-auth.ts` — any `role: "coach"` user whose `groupIds` contains the group). Redundant today but widens the authz boundary; remove after migration M2.
7. ~~**Group deletion leaves dangling `groupIds`/`activeGroupId`** on member users.~~ **DONE (2026-08-10)** — the cascade now `$pull`s the deleted group ids from every member's `groupIds` and `$unset`s a matching `activeGroupId` (members left without an active group land on the existing join/create flow). Note the account-deletion cascade is the **only** place a group is ever deleted — there is no delete-group endpoint (see the note under API-8).
8. **Timezone bug in day filters.** `applyDateFilter()` (`lib/log-filters.ts`) builds day boundaries in server-local time (UTC on Vercel) — wrong day for non-UTC users. Needs client tz/offset.

**Index improvements** (all in `lib/ensure-indexes.ts` unless noted)
- Move the ad-hoc `invites` indexes out of `app/api/groups/[groupId]/invites/route.ts` (`ensureInviteIndexes`, awaited on every POST) into `ensure-indexes.ts`.
- Add: `pending_signups.token`, `password_reset_tokens.token` (both are per-request token lookups = collection scans on the auth hot path), `guardianPendingAthletes` (`guardianId`, `athleteEmail`), `guardianLinks.athleteId`.
- Drop redundant prefixes: `logs {userId:1}`; `skippedDays {userId:1}` and `{userId:1, dayOfWeek:1}`.
- Add TTL (`expireAfterSeconds: 0` on `expiresAt`) to `pending_signups`, `password_reset_tokens`, `invites` — pattern already used by `pending_under13_child`. Keep request-time expiry checks (TTL is lazy). Do NOT TTL `checkins` (needed for attendance history).
- Account-deletion cleanup paths scan: `comments.authorId`, `checkins.headCoachId`, `attendance.groupId` (low priority).

**Planned migrations** (each: backfill first with dual reads intact → verify → flip reads per call site with e2e runs → drop legacy field in a separate change; run against a prod snapshot first)
- **M1:** Backfill legacy `users.groupId` → `groupIds`, then delete the last singular read (invites route) and this gotcha.
- **M2:** Guarantee head coach is always in `groups.coachIds`; then `coachIds` = "who can coach", `headCoachId` = "who owns", and `canManageGroup()` simplifies (fixes bug 6).
- **M3:** Backfill `groupMemberships` from `users.groupIds` and make it the single membership authority; derive or drop `users.groupIds`. Highest risk — touches member lists + log visibility.
- ~~Wrap the account-deletion cascade (~15 sequential writes, no transaction) in a multi-document transaction.~~ **DONE (2026-08-10)** — the cascade runs inside `session.withTransaction()`. Standalone mongod (no replica set) can't do transactions, so a "transactions unsupported" error — and *only* that error — falls back to sequential writes with a warning; any other failure still surfaces as a 500 rather than silently replaying the cascade unwrapped. Covered by `__tests__/api/account-deletion-cascade.test.ts`.

### Migrations

Schema/data migrations live in `scripts/migrations/` and run through the harness in
`scripts/migrations/runner.ts`. Each is declared with a stable `id` (never change it once run) and
recorded in the `migrations` collection.

```bash
pnpm tsx scripts/migrations/<name>.ts --dry-run   # report only, writes nothing
pnpm tsx scripts/migrations/<name>.ts             # apply (no-op if already recorded)
pnpm tsx scripts/migrations/<name>.ts --force     # re-run an already-applied migration
```

**Required sequence for every migration** — do not compress these into one deploy:

1. Write the migration so it is idempotent on its own, and honour `ctx.dryRun` (never write on a dry run).
2. Rehearse: restore a production snapshot and run `--dry-run`, then a real run, against it.
3. Backfill production **with dual reads still in place** — the old field stays readable.
4. Verify the data, then flip reads one call site at a time, with an e2e run per flip.
5. Drop the legacy field in a **separate** change, once nothing reads it.

### API Audit Findings (2026-07-07) — open work

Full audit of `app/api/` route handlers (auth/authz boundaries, token handling, input validation, the log-visibility model, race conditions, response shape). Not yet fixed; ordered by priority. No overlap with the DB audit above. Findings 1, 3, 4, 6 mostly reduce to reusing logic that already exists (`buildVisibilityFilter`/`coachVisibilityCondition` in `lib/log-filters.ts`, `canManageGroup()` in `lib/api-auth.ts`).

**High — data exposure / account safety**
1. ~~**Group member roster is readable by anyone.**~~ **DONE (2026-08-10)** — `app/api/groups/route.ts` now 403s unless the caller is a member (`users.groupIds`) or a coach (`coachIds`/`headCoachId`, compared via `.toString()`) of `groupId`, before the `members` array is built. Both callers only ever pass their own `activeGroupId`, so no client changed. Regression test: `__tests__/api/group-roster-access.test.ts`. Note the `isCoachOfGroup` mere-membership fallback is still present — it disappears with M2/DB-6.
2. ~~**Google OAuth ignores `verified_email`.**~~ **DONE (2026-08-10)** — the callback now redirects to `/auth?error=email_not_verified` (message in `lib/auth-errors.ts`) unless `verified_email === true`, before any account lookup or linking. Email normalization also gained the missing `.trim()` (part of API-22).

**Medium — authorization & visibility model**
3. ~~**Coaches can read/post comments on `visibility: "private"` logs.**~~ **DONE (2026-08-10)** — the canonical rule is now exported from `lib/log-filters.ts` as `COACH_VISIBILITY_CONDITION` (the Mongo condition, used by `buildVisibilityFilter`) and `isLogVisibleToCoach(log)` (the per-document counterpart). Both comment handlers call the latter and 403 non-owners on non-coach-visible logs; the GET projection gained `isGroup` so the legacy arm evaluates correctly. **Reuse these two exports — do not re-derive the rule inline.**
4. ~~**Guardian calendar exposes athletes' private logs.**~~ **CONFIRMED BY DESIGN (2026-08-10)** — guardians are *meant* to see their athlete's log emoji, including for `visibility: "private"` logs. What they must never see is the log **notes**. Both queries (`app/api/guardian/calendar/route.ts:169-182` and `:275-282`) already project only `userId, groupId, emoji, timestamp`, so notes never leave the server. **The projection is the sole enforcement point** — there is deliberately no visibility filter here, so widening the projection silently leaks private notes. Pinned by `__tests__/api/guardian-calendar-projection.test.ts`.
5. ~~**Assistant coach can evict/transfer the head coach.**~~ **DONE (2026-08-10)** — `members/route.ts` now 403s on `remove`/`transfer` when the target is the group's `headCoachId`, and when the target's role is `coach` (coach removal must go through `coaches/[coachId]` DELETE, which is head-coach-gated).
6. ~~**Review route authz is looser than the read path.**~~ **DONE (2026-08-10)** — the review route now uses `isLogVisibleToCoach()` for visibility and authorizes against `log.groupId` via `canManageGroup()`. Logs predating `groupId` fall back to "the owner belongs to a group this caller actually coaches" (queried from `groups.headCoachId`/`coachIds`, not the caller's own membership).
7. ~~**Invite is consumed before per-type validation.**~~ **DONE (2026-08-10)** — the route now **reserves** the invite instead of deleting it: `findOneAndUpdate` sets a `claimedAt` marker, the type handler runs, and the handler's own success-path `deleteOne` is what actually consumes it. A non-2xx response or a thrown error releases the reservation (`$unset claimedAt`), so a mistyped password no longer kills the link. Concurrency is preserved — a second request can't claim a reserved invite (409) — and a reservation older than `CLAIM_TTL_MS` (5 min) is reclaimable so a crashed redeem can't strand the invite. **This deliberately avoids duplicating the handlers' validation rules in a pre-check, which would drift.** Covered by `__tests__/api/invite-redeem-claim.test.ts`.
8. ~~**Head coach can leave and orphan their group.**~~ **DONE (2026-08-10)** — `handleLeave` now 400s when the caller is the group's `headCoachId`, telling them to transfer ownership or delete the group first. **Open follow-up (found 2026-08-10):** that error message is a dead end — there is no delete-group endpoint anywhere in `app/api/`. The only code path that deletes a group is the account-deletion cascade, so a head coach's sole route to removing a group is deleting their entire account. Either add a `DELETE /api/groups/[groupId]` (head-coach-gated, reusing the cascade's group cleanup incl. the DB-7 member fixup) or reword the message to say transfer-only.

**Medium — membership dual-field drift** (`users.groupIds` ⇄ `groupMemberships` ⇄ `groups.coachIds`; interacts with migrations M2/M3 — sequence together)
9. **Coach add/remove desyncs the three membership stores.** Adding a coach (`coaches/route.ts:63-70`) updates `coachIds` + `groupIds` but never inserts a `groupMemberships` doc. Removing via `members/route.ts` `remove` deletes `groupMemberships` + pulls `groupIds` but never pulls `coachIds` (removed coach still passes `canManageGroup`); removing via `coaches/[coachId]` DELETE pulls `coachIds` + `groupIds` but never deletes the `groupMemberships` doc. Fix: each add/remove touches all three stores.
10. **`handleCoachInvite` writes a bogus `coachIds` onto the user doc.** `redeem/type-handlers.ts:305-307` does `$addToSet: { groupIds, coachIds: groupId }` on the *user* — `coachIds` is a group-only field. Fix: drop `coachIds` from the user update (correct group-side update already at `:324-329`).

**Medium — races & input validation** (12, 13 share the unique-index + upsert remedy of DB-audit bugs 3, 4)
11. **Roles CRUD is a lost-update race.** `app/api/groups/[groupId]/roles/route.ts` POST/PATCH/DELETE read the whole `roles` array, mutate in memory, and `$set` it back — concurrent co-coach edits clobber each other. Fix: `$push`/`$pull`/array-filter operators.
12. **Daily-log-limit is a non-atomic read-modify-write.** `app/api/logs/route.ts:246-298` reads today's logs, checks `hasShared`/`hasPrivate`, then inserts — double-submit bypasses the one-shared/one-private-per-day limit. Fix: unique index + upsert, or atomic guard.
13. **`skipped-days` POST: per-slot findOne-then-insert race + N+1.** `app/api/skipped-days/route.ts:49-64` loops `findOne`→`insertOne` per slot with no unique index. Fix: unique index + `bulkWrite` upserts.
14. **Log create/update writes unvalidated, unbounded fields.** `app/api/logs/route.ts` POST (`:232-296`)/PUT (`:419-427`) only check `!emoji`: `notes` has no length cap (comments 1000, announcements 500, feedback 2000), `tags` is unbounded with uncoerced element types, `visibility` is stored verbatim (accepts `"banana"`, which hides the log from coaches and confuses the limit logic), and `timestamp` is `new Date(clientInput)` (can store `Invalid Date`). Fix: validate/clamp each field; whitelist `visibility` to `coach|private`.
15. ~~**Admin auth hardening.**~~ **DONE (2026-08-10)** — new `lib/admin-auth.ts` is the only place `ADMIN_SECRET` is touched: `verifyAdminPassword()` (constant-time, length-safe), `createAdminSession()` (issues an 8h HS256 JWT signed with the secret — the cookie is no longer a copy of the credential), `verifyAdminSession()`, `deleteAdminSession()`. All 6 sites now call it (4 waitlist routes, the auth route, `app/admin/layout.tsx`); the duplicated local copies are gone. `adminAuthRateLimiter` (5/min/IP) added in `lib/rate-limit.ts`. **Existing admin cookies are invalid — admins must sign in again.**

**Low — hardening / consistency**
16. **`activeGroupId` read but not projected** in guardian calendar (`guardian/calendar/route.ts:64-79` projects `groupId, groupIds` but reads `a.activeGroupId` at line 77 → always undefined); a drifted active group drops from `availablePairs`.
17. **`safeObjectId` not applied to `groupId`/`athleteId`** across group routes (`roles`, `training-schedule`, `invites`, `members`, `members/[athleteId]/guardians`) and inside `canManageGroup` — malformed id throws → generic 500 instead of the documented 400.
18. **Bulk invites skip the single-invite guards** (`invites/bulk/route.ts:61-160`): no already-member check, no existing-invite dedupe, no plan/seat limit; re-invites and re-emails everyone.
19. **Attendance `entries` unvalidated:** `attendance/route.ts:154-172` accepts arbitrary `userId`s (not checked against group membership) and an unbounded array; GET returns athlete `email`s to coaches.
20. **User enumeration** via differing responses on login (`login/route.ts` — unknown vs google-only vs unverified), signup 409, and forgot-password's 500-only-when-email-exists path; plus non-timing-safe `bcrypt.compare` gated on user existence.
21. **Stateless 7-day JWTs can't be revoked** (`lib/auth.ts`): logout, password reset, and account deletion don't invalidate already-issued tokens.
22. **Email normalization inconsistent:** login/signup/forgot-password/oauth do `.toLowerCase()` without `.trim()`, unlike `waitlist` and `lib/auth-config.ts` — trailing-space signups won't match at login.
23. **Missing string-type guards** on `email`/`password` in login/signup/forgot-password/waitlist → `.toLowerCase()` on a non-string throws a 500 instead of a 400.
24. **`GET /api/auth/session` performs writes** (`session/route.ts:24-31`) — a per-page-load read-modify-write on `users.groupIds` that can race and drop a concurrently-added group.
25. ~~**Dead endpoint:** `app/api/sentry-example-api/route.ts` is an unauthenticated `GET` that always throws to trigger Sentry.~~ **DONE (2026-08-10)** — removed along with the example page (frontend-12).
26. **Public waitlist POST** (`waitlist/route.ts`): the client `groups` object is persisted with near-zero shape validation (only `groups[0].ageGroups` checked), no rate limit, and the 409 enables email enumeration.
27. **Response-shape deviations** from `{ error: string }`: group-limit responses add `plan`/`limit` (`post-handlers.ts:40`, `invites/route.ts:113`); signup surfaces the raw Resend error message; `email/inbound` returns bare `{}`; `logout` has no try/catch.

Frontend audit findings live in `components/CLAUDE.md` ("Frontend Audit Findings (2026-07-07)") — React Query invalidation gaps, hooks-hygiene bugs, and client/server contract drift.

### Infrastructure/Architecture Audit Findings (2026-07-08) — open work

Audit of the cross-cutting layer: `middleware.ts`, `lib/` infrastructure (mongodb, env, rate-limit, resend, streak, auth), Sentry/Next config, dependency hygiene, and test coverage. Not yet fixed; ordered by priority. Completes the four-pass audit (DB → API → frontend → infra). Positive findings worth knowing: rate limiting IS wired into login/signup/forgot-password/logs/comments/checkins (only admin + waitlist lack it, per API-audit 15/26); session cookie flags are correct (httpOnly, `sameSite: lax`, secure in prod); security headers exist (but see 10); routes generally re-check roles in the DB rather than trusting the JWT `role` claim.

**High**
1. ~~**Sentry ships PII — including, on captured request errors, the session JWT cookie — to a third party.**~~ **DONE (2026-08-10)** — all three configs now set `sendDefaultPii: false`, `tracesSampleRate: 0.1`, and `beforeSend: scrubSentryEvent` (`lib/sentry-scrub.ts`, which unconditionally strips `request.cookies`, the `cookie`/`authorization`/`x-forwarded-for` headers, and `user.ip_address` as defence in depth). Client Session Replay was removed entirely — it records the DOM (athlete names, emails, log notes) for users who may be under 13; re-enable only with `maskAllText`/`blockAllMedia` and a deliberate privacy review. `enableLogs: true` kept.
2. ~~**Admin page gate is another raw-secret-cookie compare.**~~ **DONE (2026-08-10)** — `app/admin/layout.tsx` now calls the shared `verifyAdminSession()`; see API-15.

**Medium**
3. ~~**Index bootstrap is fire-and-forget and never retries.**~~ **DONE (2026-08-10)** — `ensureIndexes()` now declares each index as a named `IndexSpec` and runs them with `Promise.allSettled` (not `all`), so one failure no longer aborts the batch; every rejection is logged and sent to Sentry tagged with the index name, and the function returns `false`. `lib/mongodb.ts` only latches `_indexesBootstrapped` when that return is `true`, so a failed attempt retries on the next cold start (an in-flight promise is shared so concurrent `getDb()` calls don't stampede). This is what makes the DB-3/4/5 unique indexes safe to add: a duplicate-key collision is now loud instead of invisible.
4. ~~**No server-side role gating on dashboard routes.**~~ **DONE (2026-08-10)** — `middleware.ts` now redirects non-coaches away from `COACH_ONLY_PREFIXES` (`/dashboard/attendance`, `/club`, `/group`), mirroring the `useRequireAuth({ requireCoach: true })` guards. Keep that list in sync when adding coach-only routes. Defence in depth only — the JWT `role` claim can be stale (see finding 5), so API routes stay the authority. The one promotion path (coach-invite redeem, `type-handlers.ts:337`) re-issues the session, so promoted coaches aren't locked out.
5. **JWT claims (`role`, `activeGroupId`, `displayName`) go stale for up to 7 days.** Mostly harmless because routes re-check the DB, but `app/api/athlete/sync-group-schedule/route.ts:19` trusts `session.activeGroupId` and `profile/route.ts:130-131` echoes stale claims. Ties to API-audit 21 (no revocation): role changes/removals don't reach issued tokens. Fix: treat the JWT as identity-only (`userId`, `email`); read the rest from the DB.
6. **Rate limiting fails open silently + weak IP keying.** `lib/rate-limit.ts:12-17` returns `null` (= unlimited) if Upstash env vars are missing in prod, with no startup warning; `getIp()` (`:41-45`) trusts the leftmost `x-forwarded-for` value and buckets all header-less traffic as `"anonymous"`. Acceptable behind Vercel (platform overwrites XFF) but fragile if hosting changes. Fix: warn loudly when limiters are disabled in prod; prefer a platform-set header.
7. **Env-var policy is inconsistent; email misconfig fails soft in the worst way.** `lib/env.ts` validates only `MONGODB_URI`/`AUTH_SECRET`/`NEXT_PUBLIC_APP_URL`. `lib/resend.ts:3-4` defaults `RESEND_FROM_EMAIL` to `onboarding@resend.dev` and `APP_URL` to `http://localhost:3000` — a prod deployment missing these silently sends real users localhost links from a resend.dev address. `ADMIN_SECRET`, `GOOGLE_*`, `UPSTASH_*` each degrade differently at runtime. Fix: add email vars to `validateEnv()` (or fail the module in production when unset); document the intended degrade mode per var.
8. **Timezone model is fragmented (three conventions coexist).** (a) `lib/streak.ts` interprets user-entered slot times ("HH:mm") as **UTC** (`slotInstanceForDate` → `setUTCHours`), so the 24h log window is shifted by the user's UTC offset — a log shortly *before* local practice time can miss its slot for western-timezone users, and skip matching compares `toISOString()` date strings with the same skew; (b) streak/skip paths take a client-supplied `localDate` string; (c) `applyDateFilter` uses server-local (UTC) day boundaries (DB-audit bug 8) while `lib/date-utils.ts` `getDateFilterParams` uses browser-local time. Fix: pick one convention — store the user's IANA timezone and compute slot instances/day boundaries in it; document it in this file.

**Low — hygiene & coverage**
9. **Dead dependencies and orphaned files:** ~~`react-hook-form`, `@hookform/resolvers`, `src/index.css`, `app/opengraph-image- prev.png`~~ **DONE (2026-08-10)** — removed. **Still open:** `zod` is a dependency imported nowhere; keep it — it is the intended vehicle for the API-14/17/19/22/23/26 validation pass.
10. **No `Content-Security-Policy` header** in `next.config.mjs` `securityHeaders` (XFO/nosniff/referrer/permissions are present). Even a report-only CSP would be a step.
11. **Test coverage misses the authz/visibility kernel.** **MOSTLY DONE (2026-08-10)** — added `__tests__/lib/log-filters.test.ts` (the canonical visibility rule: both `isLogVisibleToCoach` arms, private/junk-visibility rejection, per-role `buildVisibilityFilter`, the match-nothing filter that stops a coach reading an arbitrary `userId`, and cursor/date filters), plus `subscription.test.ts` and `group-actions.test.ts`. Suite is 131 tests, up from 78. **Still open:** `cypress/e2e/guardian/` is an empty directory — guardian flows are exercised only by `cross-role/guardian-calendar.cy.ts`.
12. ~~**No migration convention.**~~ **DONE (2026-08-10)** — `scripts/migrations/runner.ts` provides `runMigration({ id, description, up })`: shared `.env` loading and connection, a `migrations` collection recording each run (id, timing, scanned/modified counts, log lines), `--dry-run` (writes nothing; warns if the migration reports modifications, i.e. ignored `ctx.dryRun`) and `--force` to re-run. Migrations must still be independently idempotent — the run log is a record, not the safety mechanism. See "Migrations" below for the required sequence.
13. **`parseTime` passes NaN through.** `lib/time-utils.ts:6` — `Number("bad") ?? 0` is `NaN` (nullish check doesn't catch NaN), so a malformed slot time yields `setUTCHours(NaN)` → Invalid Date silently inside streak math. Fix: fall back to 0 on `Number.isNaN`.

## Directory Map

| Directory | Purpose |
|-----------|---------|
| `app/api/` | REST API route handlers |
| `app/auth/` | Login/signup pages |
| `app/dashboard/` | Main dashboard (layout + sub-routes) |
| `components/ui/` | shadcn/ui primitives |
| `components/main/` | Feature components organized by role (coach, guardian, dashboard, account) |
| `components/main/dashboard/` | Core dashboard components (logs, sidebar, filters, announcements, checkins) |
| `components/main/shared/` | Shared across roles (DeleteConfirmDialog, EmptyStateCard, EmojiPicker, etc.) |
| `components/main/coach/` | Coach-specific features (groups, attendance) |
| `components/main/guardian/` | Guardian-specific features |
| `components/main/account/` | Settings/profile area |
| `hooks/` | Custom React hooks (`use-` prefix, one per file) |
| `lib/` | Server/client utilities (auth, db, streak calc, date/time) |
| `types/dashboard.ts` | All shared TypeScript types — never duplicate |
| `cypress/e2e/` | E2E tests organized by feature area |

## Data Fetching (Client)
- React Query (TanStack Query v5) for all client data fetching
- Shared fetcher in `lib/query-client.ts`: `apiFetcher` (single), `logsFetcher` (paginated)
- Centralized query keys in `lib/query-keys.ts` — hierarchical keys enable prefix-based invalidation
- `useQuery` for single resources, `useInfiniteQuery` for paginated feeds
- `QueryProvider` wraps the app in `components/query-provider.tsx`

## Testing
After editing or adding a feature, update or add the related E2E and/or unit tests.
See `cypress/CLAUDE.md` for E2E conventions.

## Refactored Modules

Large route handlers are split into colocated helper files:
- `app/api/groups/post-handlers.ts` — `handleCreate`, `handleJoin`, `handleSwitch`, `handleLeave`
- `app/api/invites/[token]/redeem/type-handlers.ts` — `handleUnder13ParentInvite`, `handleAthleteInvite`, `handleParentInvite`

Component sub-components:
- `components/main/coach/groups/athlete-row.tsx` — per-athlete row (role dropdown, transfer, remove)
- `components/main/coach/groups/guardians-popover.tsx` — guardian list + invite popover
- `components/main/dashboard/logs/comment-item.tsx` — individual comment bubble (exports `Comment` type)
- `components/main/dashboard/sidebar/group-switcher.tsx` — group switcher dropdown
- `components/main/dashboard/sidebar/group-action-form.tsx` — join/create group form (`forceOpen` prop for "Join Another" flow)
