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
3. ~~**No unique index on `groups.code`.**~~ **DONE (2026-08-10)** — unique + sparse index added, and `generateUniqueGroupCode()` was replaced by `insertGroupWithUniqueCode()` (`lib/group-actions.ts`), which generates a code, attempts the insert, and retries only on a duplicate-key error for the `code` index (any other error is rethrown; gives up after 5 attempts). The check-then-insert query is gone entirely — the index is now what guarantees uniqueness, not a pre-check.
4. ~~**Attendance duplicate-doc race.**~~ **DONE (2026-08-10)** — `{checkinId, groupId}` is now unique (the non-unique predecessor is dropped first, since MongoDB won't change index options in place) and the handler does a single `findOneAndUpdate` upsert with `$setOnInsert: { createdAt }`.
5. ~~**`guardianLinks` upsert race.**~~ **DONE (2026-08-10)** — `{guardianId, athleteId}` is now unique, and the one raw `insertOne` (`app/api/auth/verify-under13-child/route.ts`) became an upsert like the other three call sites. **Still open:** the `athleteId`-only index (queried without `guardianId`) — grouped with the other index additions below.
6. **`canManageGroup()` grants manage rights via mere membership** (`lib/api-auth.ts` — any `role: "coach"` user whose `groupIds` contains the group). Redundant today but widens the authz boundary; remove after migration M2.
7. ~~**Group deletion leaves dangling `groupIds`/`activeGroupId`** on member users.~~ **DONE (2026-08-10)** — the cascade now `$pull`s the deleted group ids from every member's `groupIds` and `$unset`s a matching `activeGroupId` (members left without an active group land on the existing join/create flow). Note the account-deletion cascade is the **only** place a group is ever deleted — there is no delete-group endpoint (see the note under API-8).
8. **Timezone bug in day filters.** `applyDateFilter()` (`lib/log-filters.ts`) builds day boundaries in server-local time (UTC on Vercel) — wrong day for non-UTC users. Needs client tz/offset.

**Index improvements** (all in `lib/ensure-indexes.ts` unless noted) — **DONE (2026-08-15)**
- ~~Move the ad-hoc `invites` indexes out of `app/api/groups/[groupId]/invites/route.ts`~~ — `ensureInviteIndexes()` (previously awaited on every POST) is gone; `invites.token_unique` and `invites.groupId_expiresAt` are now named `IndexSpec` entries in `ensure-indexes.ts`, created once at startup with the same Sentry-tagged per-index failure reporting as everything else there.
- ~~Add: `pending_signups.token`, `password_reset_tokens.token`, `guardianPendingAthletes` (`guardianId`, `athleteEmail`), `guardianLinks.athleteId`.~~ — all four added; the token indexes are unique.

**Before adding any unique index, run `pnpm audit:dupes` against that database** (`scripts/audit-duplicates.ts`, read-only, exits 1 if duplicates exist). A `createIndex` that collides with existing duplicates now fails loudly to Sentry rather than silently, but it still leaves the index unbuilt. The script covers every key currently under a unique constraint: `groups.code`, `attendance.{checkinId, groupId}`, `skippedDays.{userId, dayOfWeek, scheduledTime, date}`, `guardianLinks.{guardianId, athleteId}`, `pending_signups.token`, `password_reset_tokens.token`, and the per-day log limit. Ran clean before this batch.
- ~~Drop redundant prefixes: `logs {userId:1}`; `skippedDays {userId:1}` and `{userId:1, dayOfWeek:1}`.~~ — dropped via explicit `dropIndex(...).catch(() => {})` specs (index-name-based, so a fresh database with no such index is a no-op).
- ~~Add TTL (`expireAfterSeconds: 0` on `expiresAt`) to `pending_signups`, `password_reset_tokens`, `invites`~~ — added, each as its own single-field TTL index (kept separate from `invites.groupId_expiresAt`, which stays for the groupId-scoped query). Request-time expiry checks are unchanged in each route (TTL deletion is lazy). Did **not** TTL `checkins` (needed for attendance history).
- Account-deletion cleanup paths scan: `comments.authorId`, `checkins.headCoachId`, `attendance.groupId` (low priority).

**Planned migrations** (each: backfill first with dual reads intact → verify → flip reads per call site with e2e runs → drop legacy field in a separate change; run against a prod snapshot first)
- **M1:** Backfill legacy `users.groupId` → `groupIds`, then delete the last singular read (invites route) and this gotcha.
- **M2:** Guarantee head coach is always in `groups.coachIds`; then `coachIds` = "who can coach", `headCoachId` = "who owns", and `canManageGroup()` simplifies (fixes bug 6).
- **M3:** Backfill `groupMemberships` from `users.groupIds` and make it the single membership authority; derive or drop `users.groupIds`. Highest risk — touches member lists + log visibility.
- ~~Wrap the account-deletion cascade (~15 sequential writes, no transaction) in a multi-document transaction.~~ **DONE (2026-08-10)** — the cascade runs inside `session.withTransaction()`. Standalone mongod (no replica set) can't do transactions, so a "transactions unsupported" error — and *only* that error — falls back to sequential writes with a warning; any other failure still surfaces as a 500 rather than silently replaying the cascade unwrapped. Covered by `__tests__/api/account-deletion-cascade.test.ts`.

### E2E test-data invariants

`cy.task("cleanupTestData")` (`cypress.config.ts`) runs once before every Cypress
run and deletes groups named `/^E2E /`. Two rules it must keep:

- **Never delete the seeded fixture group** (code `E2ETST`, from `scripts/seed-test-users.ts`).
  The seeded coach head-coaches it and the seeded athlete belongs to it. Deleting it left both
  accounts pointing at a group that no longer existed, so the coach head-coached nothing — which
  silently broke the log-review authorization tests, since the review route (correctly) requires the
  caller to actually coach the log's group.
- **Clear what it deletes.** Removing a group must also `$pull` it from `users.groupIds` and
  `$unset` a matching `activeGroupId` — the same cleanup the app performs (DB-audit 7). Note
  `groupMemberships.groupId` is a **string**, so it must be matched with string ids, not ObjectIds.

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
9. ~~**Coach add/remove desyncs the three membership stores.**~~ **DONE (2026-08-10)** — two helpers in `lib/group-actions.ts` are now the only way membership changes: `addCoachToGroup()` and `removeUserFromGroup()`, each writing **all three** stores (`users.groupIds`, `groupMemberships`, `groups.coachIds`). `removeUserFromGroup` pulls `coachIds` unconditionally (a no-op for athletes, so no caller has to know the target's role), matches both the string and ObjectId forms of the id, and moves `activeGroupId` to another of the user's groups when the one being left was active. All add/remove sites route through them: `coaches/route.ts` POST, `coaches/[coachId]` DELETE, and `members/route.ts` `remove`/`transfer`. `addUserToGroup()` remains the self-service counterpart (session holder joining; it also re-issues the session).
10. ~~**`handleCoachInvite` writes a bogus `coachIds` onto the user doc.**~~ **DONE (2026-08-10)** — dropped from the user update; the correct group-side `$addToSet: { coachIds }` was already there.

**Medium — races & input validation** (12, 13 share the unique-index + upsert remedy of DB-audit bugs 3, 4)
11. ~~**Roles CRUD is a lost-update race.**~~ **DONE (2026-08-10)** — POST uses `$push`, PATCH a positional `roles.$.name` update matched on `roles.id`, DELETE a `$pull`. No handler reads-then-rewrites the array, so concurrent co-coach edits no longer clobber each other; `matchedCount`/`modifiedCount` drive the 404s. The route also gained `safeObjectId` guards (part of API-17). Covered by `__tests__/api/group-roles-atomicity.test.ts`.
12. ~~**Daily-log-limit is a non-atomic read-modify-write.**~~ **DONE (2026-08-10)** — standalone logs now carry a `limitKey` field (`"YYYY-MM-DD:visibility"`) behind a **partial unique index** on `{userId, groupId, limitKey}`. Notes for anyone touching this:
    - The index is partial on `limitKey` existing because a `partialFilterExpression` **cannot** express `checkinId: { $exists: false }` (only `$exists: true` is supported), and check-in logs are exempt from the limit. Presence of the field is what scopes the index.
    - Logs created before this change have no `limitKey` and are therefore uncovered, which is why the handler **keeps** its read-check — that check gives the friendly error, the index closes the race.
    - PUT recomputes `limitKey` when visibility changes, so an edited log stays inside the guarantee.
    - `serverLocalDayKey()` in the route computes the day in **server-local** time, matching the read-check's existing notion of "today". **Phase 6 (timezone unification) must recompute `limitKey` via a migration when it moves to the user's timezone.**
13. ~~**`skipped-days` POST: per-slot findOne-then-insert race + N+1.**~~ **DONE (2026-08-10)** — one unordered `bulkWrite` of `$setOnInsert` upserts replaces the 2N-query loop, against a now-unique `{userId, dayOfWeek, scheduledTime, date}` index (non-unique predecessor dropped first). `$setOnInsert` preserves an existing skip's original reason; the response count comes from `upsertedCount`.
14. ~~**Log create/update writes unvalidated, unbounded fields.**~~ **DONE (2026-08-10)** — validated with zod via the new **`lib/validation.ts`**, which is the house pattern for request bodies (`schema.safeParse` -> `validationError(parsed.error)`); `validationError` preserves the `{ error: string }` contract and never echoes the submitted value back. `notes` capped at 1000 (matching comments), `tags` bounded, trimmed and de-duplicated with element types enforced, `visibility` whitelisted to `coach|private`, `timestamp` rejected if it would store an `Invalid Date`. Covered by `__tests__/lib/validation.test.ts`.
15. ~~**Admin auth hardening.**~~ **DONE (2026-08-10)** — new `lib/admin-auth.ts` is the only place `ADMIN_SECRET` is touched: `verifyAdminPassword()` (constant-time, length-safe), `createAdminSession()` (issues an 8h HS256 JWT signed with the secret — the cookie is no longer a copy of the credential), `verifyAdminSession()`, `deleteAdminSession()`. All 6 sites now call it (4 waitlist routes, the auth route, `app/admin/layout.tsx`); the duplicated local copies are gone. `adminAuthRateLimiter` (5/min/IP) added in `lib/rate-limit.ts`. **Existing admin cookies are invalid — admins must sign in again.**

**Low — hardening / consistency**
16. ~~**`activeGroupId` read but not projected** in guardian calendar.~~ **DONE (2026-08-15)** — `activeGroupId: 1` added to the `.project()` at `guardian/calendar/route.ts:67`; a second query later in the same file already projected it correctly, so this closes the gap between the two.
17. ~~**`safeObjectId` not applied to `groupId`/`athleteId`**~~ **MOSTLY DONE (2026-08-10)** — `canManageGroup()` now parses both ids with `safeObjectId` and returns `false` instead of throwing, which removes the 500 from **every** route that gates on it (the authz check runs before any `new ObjectId` in all of them). The `roles` route validates `groupId` explicitly (400), and the guardians route validates `athleteId`, which `canManageGroup` does not cover. **Remaining nuance:** routes relying solely on the `canManageGroup` guard answer a malformed id with 403 rather than the documented 400 — no longer a 500, but not yet the documented status.
18. ~~**Bulk invites skip the single-invite guards.**~~ **MOSTLY DONE (2026-08-10)** — the already-member and active-invite checks now live in `app/api/groups/[groupId]/invites/guards.ts` (`isAlreadyGroupMember`, `hasActiveInvite`) and **both** routes call them, so they cannot drift. Bulk reports skipped rows in its existing `errors[]` array rather than silently dropping them, so the coach sees why someone was not invited. **Note:** there is no athlete seat limit to apply — only *coach* invites have one (`coachSeats`), and bulk import does not create coach invites, so the original finding overstated this part.
19. ~~**Attendance `entries` unvalidated.**~~ **DONE (2026-08-10)** — entries are parsed with `attendanceEntriesSchema` (shape + status enum + 500-element cap) and then filtered against actual group membership, so a coach can no longer write attendance rows against arbitrary `userId`s. Non-members are dropped rather than rejected, so an athlete removed mid-session doesn't fail the coach's whole submission. Covered by `__tests__/api/attendance-entries.test.ts`. **Deliberately unchanged:** GET still returns athlete emails to coaches — consistent with the group roster endpoint, which coaches already read.
20. **User enumeration** via differing responses on login (`login/route.ts` — unknown vs google-only vs unverified), signup 409, and forgot-password's 500-only-when-email-exists path. **Timing side-channel closed (2026-08-15)** — `login/route.ts` now runs `bcrypt.compare` against a fixed dummy hash (`DUMMY_PASSWORD_HASH`) for unknown-user and Google-only-account responses, so those take roughly as long as a real wrong-password attempt. **Still open, deliberately unchanged:** the distinct error messages/status codes and the signup 409 stay as-is — full de-enumeration was scoped out as a bigger UX/product change than the rest of this finding.
21. **Stateless 7-day JWTs can't be revoked** (`lib/auth.ts`): logout, password reset, and account deletion don't invalidate already-issued tokens.
22. ~~**Email normalization inconsistent.**~~ **DONE (2026-08-10)** — login, signup and forgot-password now `.trim().toLowerCase()` like waitlist and `lib/auth-config.ts`. `emailSchema` in `lib/validation.ts` is the canonical normalizer for new code.
23. ~~**Missing string-type guards** on `email`/`password`.~~ **DONE (2026-08-10)** — login, signup and forgot-password type-guard both fields before normalizing, so a non-string returns the documented 400 instead of throwing a 500 inside `.toLowerCase()`. Waitlist gets this via `waitlistSchema`.
24. ~~**`GET /api/auth/session` performs writes.**~~ **DONE (2026-08-15)** — the read-modify-write on `users.groupIds` is now a single atomic `$addToSet`, so concurrent session reads can no longer race and drop each other's addition. The route still writes on a GET (unchanged, self-healing behavior kept), but the lost-update is gone.
25. ~~**Dead endpoint:** `app/api/sentry-example-api/route.ts` is an unauthenticated `GET` that always throws to trigger Sentry.~~ **DONE (2026-08-10)** — removed along with the example page (frontend-12).
26. ~~**Public waitlist POST.**~~ **MOSTLY DONE (2026-08-10)** — the body is now parsed with `waitlistSchema` (names/club bounded, email normalized, and `groups` fully shape-validated: each entry's `ageGroups` must be a non-empty bounded array of bounded strings, rather than only `groups[0].ageGroups` being glanced at), and `waitlistRateLimiter` (3/min/IP) was added — this was the one public unauthenticated write with no limit. **Still open:** the 409 on an existing entry remains an email-enumeration vector, grouped with API-20.
27. ~~**Response-shape deviations** from `{ error: string }`.~~ **DONE (2026-08-15)** — group-limit responses (`post-handlers.ts`, `invites/route.ts`) no longer add `plan`/`limit` (grepped the frontend first — nothing read those fields); signup and the invite-send paths (single, bulk, under-13-parent) now return a generic `"Failed to send ... email"` instead of the raw Resend error, which is still logged server-side via `console.error`; `logout` now wraps `deleteSession()` in try/catch matching every other route. **Left unchanged:** `email/inbound`'s bare `{}` on webhook-ack paths — it's not a client-facing error contract.

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
6. ~~**Rate limiting fails open silently**~~ **DONE (2026-08-15)** — `lib/rate-limit.ts` now does a one-time `console.error` + `Sentry.captureMessage(..., "warning")` the first time a limiter would return `null` (unlimited) in production due to missing Upstash env vars, so the degrade is loud instead of silent. **Weak IP keying left as-is** — `getIp()` (`:41-45`) still trusts the leftmost `x-forwarded-for` value; acceptable behind Vercel (platform overwrites XFF) but fragile if hosting changes.
7. ~~**Env-var policy is inconsistent; email misconfig fails soft in the worst way.**~~ **DONE (2026-08-15)** — `lib/env.ts`'s `validateEnv()` now also requires `RESEND_API_KEY`/`RESEND_FROM_EMAIL` when `NODE_ENV === "production"` (not in dev/test, so local setups without email configured still work), closing the "prod deploy silently emails localhost links from a resend.dev address" failure mode. `lib/resend.ts`'s defaults stay as a dev-only fallback now that production can't reach them unset. Degrade mode per remaining optional var, for reference: `ADMIN_SECRET` unset → admin routes 401 via `lib/admin-auth.ts`; `GOOGLE_*` unset → `/api/auth/google` returns a clean 500 `{ error: "Google OAuth is not configured" }` rather than throwing; `UPSTASH_*` unset in production → rate limiting disabled, now loud (see infra-6 below) rather than silent.
8. **Timezone model is fragmented (three conventions coexist).** (a) `lib/streak.ts` interprets user-entered slot times ("HH:mm") as **UTC** (`slotInstanceForDate` → `setUTCHours`), so the 24h log window is shifted by the user's UTC offset — a log shortly *before* local practice time can miss its slot for western-timezone users, and skip matching compares `toISOString()` date strings with the same skew; (b) streak/skip paths take a client-supplied `localDate` string; (c) `applyDateFilter` uses server-local (UTC) day boundaries (DB-audit bug 8) while `lib/date-utils.ts` `getDateFilterParams` uses browser-local time. Fix: pick one convention — store the user's IANA timezone and compute slot instances/day boundaries in it; document it in this file.

**Low — hygiene & coverage**
9. **Dead dependencies and orphaned files:** ~~`react-hook-form`, `@hookform/resolvers`, `src/index.css`, `app/opengraph-image- prev.png`~~ **DONE (2026-08-10)** — removed. **Still open:** `zod` is a dependency imported nowhere; keep it — it is the intended vehicle for the API-14/17/19/22/23/26 validation pass.
10. ~~**No `Content-Security-Policy` header**~~ **DONE (2026-08-15)** — a `Content-Security-Policy-Report-Only` header was added to `securityHeaders` in `next.config.mjs` (baseline `default-src 'self'` policy, permissive enough not to break Sentry/Vercel Toolbar/Google OAuth while it's report-only). Not yet enforcing — that's a follow-up once reports are reviewed.
11. **Test coverage misses the authz/visibility kernel.** **MOSTLY DONE (2026-08-10)** — added `__tests__/lib/log-filters.test.ts` (the canonical visibility rule: both `isLogVisibleToCoach` arms, private/junk-visibility rejection, per-role `buildVisibilityFilter`, the match-nothing filter that stops a coach reading an arbitrary `userId`, and cursor/date filters), plus `subscription.test.ts` and `group-actions.test.ts`. Suite is 131 tests, up from 78. **Still open:** `cypress/e2e/guardian/` is an empty directory — guardian flows are exercised only by `cross-role/guardian-calendar.cy.ts`.
12. ~~**No migration convention.**~~ **DONE (2026-08-10)** — `scripts/migrations/runner.ts` provides `runMigration({ id, description, up })`: shared `.env` loading and connection, a `migrations` collection recording each run (id, timing, scanned/modified counts, log lines), `--dry-run` (writes nothing; warns if the migration reports modifications, i.e. ignored `ctx.dryRun`) and `--force` to re-run. Migrations must still be independently idempotent — the run log is a record, not the safety mechanism. See "Migrations" below for the required sequence.
13. ~~**`parseTime` passes NaN through.**~~ **DONE (2026-08-15)** — `lib/time-utils.ts` now checks `Number.isNaN(h)`/`Number.isNaN(m)` explicitly instead of relying on `??`, so a malformed slot time falls back to `0` instead of silently producing `Invalid Date` inside streak math.

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
