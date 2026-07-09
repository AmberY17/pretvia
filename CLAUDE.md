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
1. **Assistant-coach account deletion destroys groups they don't own.** `app/api/auth/account/route.ts` cascades-deletes every group matching `$or: [{headCoachId}, {coachIds}]`. Fix: cascade only `headCoachId` groups; `$pull` the user from `coachIds` otherwise.
2. **Coach deletion orphans log reviews.** Same route deletes `log_reviews` by legacy `headCoachId` field, but reviews are written with `coachId` (`app/api/logs/[logId]/review/route.ts`). Fix: delete by `$or` on both fields (old docs may still carry `headCoachId`).
3. **No unique index on `groups.code`.** `generateUniqueGroupCode()` (`lib/group-actions.ts`) is check-then-insert — duplicate codes possible under concurrency; code lookups are collection scans. Check prod for existing dupes before adding the unique index.
4. **Attendance duplicate-doc race.** `app/api/attendance/route.ts` does findOne-then-insert/update; the `{checkinId, groupId}` index is not unique. Fix: unique index + upsert (dedupe prod first).
5. **`guardianLinks` upsert race + missing index.** Upserted on `{guardianId, athleteId}` with no unique index (3 call sites); also queried by `athleteId` alone with no index.
6. **`canManageGroup()` grants manage rights via mere membership** (`lib/api-auth.ts` — any `role: "coach"` user whose `groupIds` contains the group). Redundant today but widens the authz boundary; remove after migration M2.
7. **Group deletion leaves dangling `groupIds`/`activeGroupId`** on member users — nothing cleans them up.
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
- Wrap the account-deletion cascade (~15 sequential writes, no transaction) in a multi-document transaction.

### API Audit Findings (2026-07-07) — open work

Full audit of `app/api/` route handlers (auth/authz boundaries, token handling, input validation, the log-visibility model, race conditions, response shape). Not yet fixed; ordered by priority. No overlap with the DB audit above. Findings 1, 3, 4, 6 mostly reduce to reusing logic that already exists (`buildVisibilityFilter`/`coachVisibilityCondition` in `lib/log-filters.ts`, `canManageGroup()` in `lib/api-auth.ts`).

**High — data exposure / account safety**
1. **Group member roster is readable by anyone.** `GET /api/groups?groupId=<id>` (`app/api/groups/route.ts:109-227`) returns every member's `email`, `displayName`, `firstName/lastName`, and `dateOfBirth` with no membership check — `isCoachOfGroup` is computed but only gates the extra `pendingAthletes`/`trainingScheduleTemplate` blocks, never the `members` array. Any authenticated user can enumerate any group's roster. Fix: require caller to be a member or coach of `groupId` before returning `members`.
2. **Google OAuth ignores `verified_email`.** `app/api/auth/google/callback/route.ts:89-110` declares `verified_email` in the type (line 13) but never checks it, then auto-links the Google identity to any existing password account with the same address (`$set: { googleId, emailVerified: true }`) and issues a session. If Google returns an unverified external identity matching a victim, this is account takeover. Fix: reject when `verified_email !== true`; only link/verify on a verified email.

**Medium — authorization & visibility model**
3. **Coaches can read/post comments on `visibility: "private"` logs.** `app/api/comments/route.ts` GET (`:41-83`) and POST (`:196-246`) project `log.visibility` but never check it — the coach branch only verifies a shared group, bypassing the feed's canonical rule (`lib/log-filters.ts:44-46`). Fix: reuse that visibility condition; deny non-owners on private logs.
4. **Guardian calendar exposes athletes' private logs.** `app/api/guardian/calendar/route.ts:169-182` and `:275-282` query logs by `userId`/`groupId`/`timestamp` with no visibility filter, surfacing private-log emoji to guardians. Confirm intended; if not, apply the `visibility: "coach"` condition.
5. **Assistant coach can evict/transfer the head coach.** `app/api/groups/[groupId]/members/route.ts:56-71` (`action: "remove"`/`"transfer"`) is gated only by `canManageGroup` (any coach passes) and never excludes `headCoachId` or restricts the target to athletes — bypassing the head-coach-only gate the `coaches/[coachId]` DELETE enforces. Fix: block removing `headCoachId`; route coach removal through the head-coach path.
6. **Review route authz is looser than the read path.** `app/api/logs/[logId]/review/route.ts:70-94` builds `coachGroupIds` from the coach's own membership and only checks the log owner is a *member* — never compares `log.groupId`, and accepts a `role:"coach"` user who merely belongs to (doesn't coach) the group. Fix: use `canManageGroup` and check `log.groupId`.
7. **Invite is consumed before per-type validation.** `app/api/invites/[token]/redeem/route.ts:54` `findOneAndDelete`s the invite, then the type handlers run password-length, under-13 parent-email-match, and role-mismatch checks (`redeem/type-handlers.ts`). Those failures return an error but the invite is already destroyed — the link permanently dies (the existing-user session case *is* pre-checked; these are not). Fix: validate body before claiming, or re-insert on failure.
8. **Head coach can leave and orphan their group.** `handleLeave` (`app/api/groups/post-handlers.ts:194-239`) never checks `headCoachId`; a head coach leaving loses membership yet still owns the group (still passes `canManageGroup`, still counts against their limit). Fix: block leave (or force ownership transfer) when caller is `headCoachId`.

**Medium — membership dual-field drift** (`users.groupIds` ⇄ `groupMemberships` ⇄ `groups.coachIds`; interacts with migrations M2/M3 — sequence together)
9. **Coach add/remove desyncs the three membership stores.** Adding a coach (`coaches/route.ts:63-70`) updates `coachIds` + `groupIds` but never inserts a `groupMemberships` doc. Removing via `members/route.ts` `remove` deletes `groupMemberships` + pulls `groupIds` but never pulls `coachIds` (removed coach still passes `canManageGroup`); removing via `coaches/[coachId]` DELETE pulls `coachIds` + `groupIds` but never deletes the `groupMemberships` doc. Fix: each add/remove touches all three stores.
10. **`handleCoachInvite` writes a bogus `coachIds` onto the user doc.** `redeem/type-handlers.ts:305-307` does `$addToSet: { groupIds, coachIds: groupId }` on the *user* — `coachIds` is a group-only field. Fix: drop `coachIds` from the user update (correct group-side update already at `:324-329`).

**Medium — races & input validation** (12, 13 share the unique-index + upsert remedy of DB-audit bugs 3, 4)
11. **Roles CRUD is a lost-update race.** `app/api/groups/[groupId]/roles/route.ts` POST/PATCH/DELETE read the whole `roles` array, mutate in memory, and `$set` it back — concurrent co-coach edits clobber each other. Fix: `$push`/`$pull`/array-filter operators.
12. **Daily-log-limit is a non-atomic read-modify-write.** `app/api/logs/route.ts:246-298` reads today's logs, checks `hasShared`/`hasPrivate`, then inserts — double-submit bypasses the one-shared/one-private-per-day limit. Fix: unique index + upsert, or atomic guard.
13. **`skipped-days` POST: per-slot findOne-then-insert race + N+1.** `app/api/skipped-days/route.ts:49-64` loops `findOne`→`insertOne` per slot with no unique index. Fix: unique index + `bulkWrite` upserts.
14. **Log create/update writes unvalidated, unbounded fields.** `app/api/logs/route.ts` POST (`:232-296`)/PUT (`:419-427`) only check `!emoji`: `notes` has no length cap (comments 1000, announcements 500, feedback 2000), `tags` is unbounded with uncoerced element types, `visibility` is stored verbatim (accepts `"banana"`, which hides the log from coaches and confuses the limit logic), and `timestamp` is `new Date(clientInput)` (can store `Invalid Date`). Fix: validate/clamp each field; whitelist `visibility` to `coach|private`.
15. **Admin auth hardening.** `app/api/admin/auth/route.ts:17` stores the raw `ADMIN_SECRET` *as* the cookie value (credential, not a revocable token), compares with non-timing-safe `!==` (`:12`), and has no rate limit; 3 of 4 `verifyAdminSession` copies use `===` while only `admin/waitlist/route.ts:13` uses `timingSafeEqual`. Fix: opaque signed admin token, one shared `timingSafeEqual` helper, rate limiting.

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
25. **Dead endpoint:** `app/api/sentry-example-api/route.ts` is an unauthenticated `GET` that always throws to trigger Sentry — anyone can spam error monitoring; remove it.
26. **Public waitlist POST** (`waitlist/route.ts`): the client `groups` object is persisted with near-zero shape validation (only `groups[0].ageGroups` checked), no rate limit, and the 409 enables email enumeration.
27. **Response-shape deviations** from `{ error: string }`: group-limit responses add `plan`/`limit` (`post-handlers.ts:40`, `invites/route.ts:113`); signup surfaces the raw Resend error message; `email/inbound` returns bare `{}`; `logout` has no try/catch.

Frontend audit findings live in `components/CLAUDE.md` ("Frontend Audit Findings (2026-07-07)") — React Query invalidation gaps, hooks-hygiene bugs, and client/server contract drift.

### Infrastructure/Architecture Audit Findings (2026-07-08) — open work

Audit of the cross-cutting layer: `middleware.ts`, `lib/` infrastructure (mongodb, env, rate-limit, resend, streak, auth), Sentry/Next config, dependency hygiene, and test coverage. Not yet fixed; ordered by priority. Completes the four-pass audit (DB → API → frontend → infra). Positive findings worth knowing: rate limiting IS wired into login/signup/forgot-password/logs/comments/checkins (only admin + waitlist lack it, per API-audit 15/26); session cookie flags are correct (httpOnly, `sameSite: lax`, secure in prod); security headers exist (but see 10); routes generally re-check roles in the DB rather than trusting the JWT `role` claim.

**High**
1. **Sentry ships PII — including, on captured request errors, the session JWT cookie — to a third party.** All three configs (`sentry.server.config.ts:19`, `sentry.edge.config.ts:19`, `instrumentation-client.ts:28`) set `sendDefaultPii: true`, which attaches IP, request headers, and cookies (the `session` credential) to server events; the client also runs 10% session Replay and `enableLogs: true`, and all three use `tracesSampleRate: 1` (cost). For a platform with under-13 users this is a privacy/COPPA concern on top of the credential leak. Fix: `sendDefaultPii: false`, scrub cookies via `beforeSend`, drop trace sampling to a fraction, reconsider Replay.
2. **Admin page gate is another raw-secret-cookie compare.** `app/admin/layout.tsx:12` does `session !== adminSecret` — the page-layer copy of API-audit finding 15 (cookie stores the literal `ADMIN_SECRET`, non-timing-safe compare). Fix together with that finding; there are now 5 compare sites (4 API + this layout).

**Medium**
3. **Index bootstrap is fire-and-forget and never retries.** `lib/mongodb.ts:44-47` sets `_indexesBootstrapped = true` *before* `ensureIndexes()` resolves and swallows every error (`.catch(() => {})`) — a failed `createIndex` (e.g., a future unique index colliding with existing dupes, exactly what DB-audit bugs 3/4/5 require) stays silently missing for the process lifetime. All planned index remediations flow through this path. Fix: log failures to Sentry at minimum; consider blocking or retrying.
4. **No server-side role gating on dashboard routes.** `middleware.ts` checks only "valid JWT" for `/dashboard/:path*`; every dashboard page is `"use client"` and `app/dashboard/layout.tsx` is a pass-through, so athlete/coach/guardian routing is purely client-side. Safety rests entirely on per-endpoint API checks — which the API audit showed are uneven. Low-cost hardening: role check in middleware (role is already a JWT claim) or in the layout.
5. **JWT claims (`role`, `activeGroupId`, `displayName`) go stale for up to 7 days.** Mostly harmless because routes re-check the DB, but `app/api/athlete/sync-group-schedule/route.ts:19` trusts `session.activeGroupId` and `profile/route.ts:130-131` echoes stale claims. Ties to API-audit 21 (no revocation): role changes/removals don't reach issued tokens. Fix: treat the JWT as identity-only (`userId`, `email`); read the rest from the DB.
6. **Rate limiting fails open silently + weak IP keying.** `lib/rate-limit.ts:12-17` returns `null` (= unlimited) if Upstash env vars are missing in prod, with no startup warning; `getIp()` (`:41-45`) trusts the leftmost `x-forwarded-for` value and buckets all header-less traffic as `"anonymous"`. Acceptable behind Vercel (platform overwrites XFF) but fragile if hosting changes. Fix: warn loudly when limiters are disabled in prod; prefer a platform-set header.
7. **Env-var policy is inconsistent; email misconfig fails soft in the worst way.** `lib/env.ts` validates only `MONGODB_URI`/`AUTH_SECRET`/`NEXT_PUBLIC_APP_URL`. `lib/resend.ts:3-4` defaults `RESEND_FROM_EMAIL` to `onboarding@resend.dev` and `APP_URL` to `http://localhost:3000` — a prod deployment missing these silently sends real users localhost links from a resend.dev address. `ADMIN_SECRET`, `GOOGLE_*`, `UPSTASH_*` each degrade differently at runtime. Fix: add email vars to `validateEnv()` (or fail the module in production when unset); document the intended degrade mode per var.
8. **Timezone model is fragmented (three conventions coexist).** (a) `lib/streak.ts` interprets user-entered slot times ("HH:mm") as **UTC** (`slotInstanceForDate` → `setUTCHours`), so the 24h log window is shifted by the user's UTC offset — a log shortly *before* local practice time can miss its slot for western-timezone users, and skip matching compares `toISOString()` date strings with the same skew; (b) streak/skip paths take a client-supplied `localDate` string; (c) `applyDateFilter` uses server-local (UTC) day boundaries (DB-audit bug 8) while `lib/date-utils.ts` `getDateFilterParams` uses browser-local time. Fix: pick one convention — store the user's IANA timezone and compute slot instances/day boundaries in it; document it in this file.

**Low — hygiene & coverage**
9. **Dead dependencies and orphaned files:** `zod`, `react-hook-form`, `@hookform/resolvers` appear in `package.json` but are imported nowhere (ironic — API-audit 14/23 are validation gaps; adopt zod or drop it); `src/index.css` is referenced by nothing; `app/opengraph-image- prev.png` (note the space) is a stray artifact. Pairs with the sentry-example page/route findings (API-25, frontend-12).
10. **No `Content-Security-Policy` header** in `next.config.mjs` `securityHeaders` (XFO/nosniff/referrer/permissions are present). Even a report-only CSP would be a step.
11. **Test coverage misses the authz/visibility kernel.** Unit tests cover `streak`, `objectid`, `auth-config`, `date-utils`, `api-auth`, `group-training-schedule`, `time-utils` — but not `lib/log-filters.ts` (the canonical visibility rule that three API-audit findings hinge on), `subscription.ts`, or `group-actions.ts`. `cypress/e2e/guardian/` is an empty directory — guardian flows are exercised only by `cross-role/guardian-calendar.cy.ts`.
12. **No migration convention.** One ad-hoc script (`scripts/migrate-active-group-id.ts`), no versioning/tracking. DB-audit migrations M1–M3 need at least: idempotent scripts + a `migrations` collection (or run log) + the documented prod-snapshot rehearsal step.
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
