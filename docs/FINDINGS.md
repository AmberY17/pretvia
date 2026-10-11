# Known Issues & Findings Tracker

Single source of truth for open audit findings. It replaces the separate lists that used to live in
`CLAUDE.md` (DB audit 2026-07-01, API audit 2026-07-07, infra audit 2026-07-08),
`components/CLAUDE.md` (frontend audit 2026-07-07), and `docs/audit-2026-10.md` (fresh-eyes audit
2026-10-10, which has the full write-ups and code sketches).

**Old IDs** are kept for traceability: `DB-n`, `API-n`, `INF-n`, `FE-n` (July audits); `S-n` / `E-n`
(October audit).

**Status:**

| Status | Meaning |
|---|---|
| `fix:batch-1/2/3` | Fixed by the October fix PR (see that PR's commits) |
| `open` | Not yet fixed |
| `deferred` | Consciously postponed, with the reason given |
| `by design` | Confirmed intended behavior |

**Triage rule (owner decision, 2026-10-11):** fix real bugs, account takeover, data loss and leaks of
promised-private or minors' data. Don't add new user-facing gates or hardening for its own sake. The app
has no real users yet.

---

## Security & privacy

| ID | Finding | Where | Status |
|---|---|---|---|
| S1 | Password reset: body `token` used directly in a Mongo query (`{"$ne":null}`) → takeover of any account with a pending reset | `app/api/auth/reset-password/route.ts` | fix:batch-1 |
| S2 | Signup: `waitlistToken`/`coachInviteToken` operator injection → coach account without waitlist approval | `app/api/auth/signup/route.ts` | fix:batch-1 |
| S3 / DB-1 | Account deletion cascades every group in `coachIds`, not just owned ones. A coach who joins a group by code ("Join Another", intentional) and then deletes their account destroys that group. | `app/api/auth/account/route.ts` | fix:batch-2 (code-join kept) |
| S3b | Group join code returned to every member (athletes included) via `my-groups` and `/api/auth/session` | `app/api/groups/route.ts`, `app/api/auth/session/route.ts` | fix:batch-2 |
| S4 / API-1 | `GET /api/groups?groupId=` returns any group's roster (emails, DOB, including minors) to any logged-in user | `app/api/groups/route.ts` | fix:batch-2 (coaches of the group only) |
| S5 / API-2 | Google OAuth links to an existing account without checking `verified_email` | `app/api/auth/google/callback/route.ts` | fix:batch-1 |
| S6 / INF-1 | Sentry `sendDefaultPii: true` sends cookies (session JWT) and IPs. Only server + edge configs exist; there is **no** client config / Replay (INF-1 was wrong about `instrumentation-client.ts`). | `sentry.server.config.ts`, `sentry.edge.config.ts` | fix:batch-1 (trace sampling left at 1 by choice) |
| API-25 / FE-12 | Unauthenticated `sentry-example-api` + orphan `sentry-example-page` | `app/api/sentry-example-api`, `app/sentry-example-page` | fix:batch-1 (deleted) |
| S8 / API-3 | Coaches can read/post comments on "Only me" logs | `app/api/comments/route.ts` | fix:batch-3 |
| API-5 | Assistant coach can remove/transfer the head coach via members PATCH | `app/api/groups/[groupId]/members/route.ts` | fix:batch-2 |
| API-4 | Guardian calendar shows athletes' private logs | `app/api/guardian/calendar/route.ts` | by design (parental access) |
| S7 / API-15 / INF-2 | Admin auth stores raw `ADMIN_SECRET` as cookie, non-constant-time compare, no rate limit (5 compare sites) | `app/api/admin/*`, `app/admin/layout.tsx` | deferred: internal tool; cookie no longer leaks via Sentry after S6 |
| S10 / INF-6 | Rate limits missing on reset-password, verify, redeem, group join, admin; limiter silently disabled when Upstash env missing; weak IP keying | `lib/rate-limit.ts` | deferred: reset tokens are 122-bit UUIDs after S1. Join-code guessing needs a waitlist-approved coach account. |
| S11 / DB-6 | `canManageGroup()` grants manage rights through plain membership | `lib/api-auth.ts` | deferred (remove after M2) |
| S12 / API-21 / INF-5 | Stateless 7-day JWTs can't be revoked; stale `role`/`activeGroupId` claims (`athlete/sync-group-schedule` trusts the claim) | `lib/auth.ts` | deferred |
| API-20 / E13 | User enumeration (login messages, signup 409, forgot-password 500 only when the account exists) | auth routes | deferred |
| INF-4 | No server-side role gating on `/dashboard/*` (client-only) | `middleware.ts` | deferred |
| INF-10 | No Content-Security-Policy header | `next.config.mjs` | open |
| API-26 | Public waitlist POST: little shape validation, no rate limit | `app/api/waitlist/route.ts` | open |
| — | `oauth_invite` cookie interpolated into a redirect path without `encodeURIComponent` (same-origin) | `google/callback/route.ts` | open (low) |
| OPS | Make sure `TEST_ACCOUNT_EMAILS` is **unset** in production (it skips verification and grants the club plan) | env | open (ops check) |

## Correctness & data integrity

| ID | Finding | Where | Status |
|---|---|---|---|
| DB-2 | Account deletion removes `log_reviews` by legacy `headCoachId`; reviews are written with `coachId` | `account/route.ts` | fix:batch-2 |
| DB-7 | Deleting a group leaves members' `groupIds`/`activeGroupId` pointing at it | `account/route.ts` (only deletion path) | fix:batch-2 |
| — | Account deletion removed an assistant's check-ins in groups that survive | `account/route.ts` | fix:batch-2 |
| API-7 / E8 | Invite consumed before per-type validation → typo kills the link | `app/api/invites/[token]/redeem/` | fix:batch-3 |
| API-10 | Coach-invite redeem writes a bogus `coachIds` field onto the user doc | `redeem/type-handlers.ts` | fix:batch-3 |
| E9 | `POST /api/logs` returns 500 if post-insert skip cleanup fails, though the log was saved | `app/api/logs/route.ts` | fix:batch-3 |
| E10 | Inbound support email forwarding failure returns 200 → Resend never retries → email lost | `app/api/email/inbound/route.ts` | fix:batch-3 |
| E11 / INF-3 | Index bootstrap errors swallowed; the flag is set before success | `lib/mongodb.ts` | fix:batch-3 (logged; no retry machinery) |
| API-14 / S9 / E12 | Log fields unvalidated: `visibility:"banana"`, `Invalid Date` timestamps (breaks streaks), unbounded tags | `app/api/logs/route.ts` | fix:batch-3 (visibility + timestamp; no notes cap by choice) |
| API-8 | Head coach can leave their group and orphan it | `app/api/groups/post-handlers.ts` | deferred: needs transfer-ownership / delete-group features first |
| DB-3 | No unique index on `groups.code` (check-then-insert) | `lib/group-actions.ts`, `lib/ensure-indexes.ts` | open |
| DB-4 | Attendance duplicate-doc race (non-unique `{checkinId, groupId}`) | `app/api/attendance/route.ts` | open |
| DB-5 | `guardianLinks` upsert race; no `athleteId` index | 3 call sites | open |
| API-11 | Roles CRUD read-modify-write loses concurrent edits | `groups/[groupId]/roles/route.ts` | open |
| API-12 | Daily log cap is check-then-insert (double-submit bypass) | `app/api/logs/route.ts` | open |
| API-13 | skipped-days POST: findOne→insert race + N+1 | `app/api/skipped-days/route.ts` | open |
| API-9 | Coach add/remove desyncs `users.groupIds` / `groupMemberships` / `groups.coachIds` | `coaches/`, `members/` routes | open (goes away with M3 or Postgres) |
| API-6 | Review route authz looser than read path (ignores `log.groupId`) | `logs/[logId]/review/route.ts` | open |
| DB-8 / INF-8 | Timezones: day filters use server UTC, streak slots are UTC, client uses local time | `lib/log-filters.ts`, `lib/streak.ts`, `lib/date-utils.ts` | open (Postgres design adds `users.timezone`) |
| API-16 | Guardian calendar reads `activeGroupId` without projecting it | `guardian/calendar/route.ts` | open |
| API-17 | `safeObjectId` not applied to `groupId`/`athleteId` in group routes and `canManageGroup` → 500 on bad ids | group routes | open |
| API-18 | Bulk invites skip already-member / dedupe / seat checks | `invites/bulk/route.ts` | open |
| API-19 | Attendance `entries` not checked against membership; unbounded | `attendance/route.ts` | open |
| API-22 | Email normalization: `.toLowerCase()` without `.trim()` in login/signup/forgot/oauth | auth routes | open |
| API-23 / E7 | Missing string-type guards → `.toLowerCase()` on a non-string returns 500 | login, forgot-password, waitlist | open (reset/signup tokens done in batch 1) |
| API-24 | `GET /api/auth/session` performs writes (`groupIds` patch) | `session/route.ts` | open |
| API-27 / E6 | Response-shape deviations; malformed JSON → 500 instead of 400 | various | open |
| INF-7 | Env policy: email vars default to `localhost` / `resend.dev` in prod | `lib/env.ts`, `lib/resend.ts` | open |
| INF-13 | `parseTime` lets `NaN` through → Invalid Date in streak math | `lib/time-utils.ts` | open |
| — | Account-deletion cascade (~20 writes) not in a transaction | `account/route.ts` | open |

## Client / frontend

| ID | Finding | Where | Status |
|---|---|---|---|
| E1 / FE-5 | `logsFetcher` ignores `res.ok` → failures render as "no logs" | `lib/query-client.ts` | fix:batch-3 |
| E2 / FE-13 | No query error states anywhere; failures look like empty data | dashboard | fix:batch-3 (feed, sidebar stats, announcements, check-ins) |
| E3 | `apiFetcher` throws `SyntaxError` on HTML error pages; 401 doesn't route to login | `lib/query-client.ts` | fix:batch-3 |
| E4 | Invite page: login fetch has no try/catch; coach form navigates twice | `app/invite/[token]/page.tsx` | fix:batch-3 |
| FE-1 | A transient session-fetch error logs the user out (`useRequireAuth` ignores `isError`) | `hooks/use-require-auth.ts` | open |
| FE-2 | Popovers defined inside the render body remount every render | `guardian-dashboard-content.tsx` | open |
| FE-3 | `handleAssignRoles` doesn't invalidate logs | `app/dashboard/group/page.tsx` | open |
| FE-4 | Creating a group doesn't refresh group lists | `club-group-section.tsx` | open |
| FE-6 | Coach "Move to" is non-atomic DELETE-then-POST | `coach-row.tsx` | open |
| FE-7 | Confetti `requestAnimationFrame` loop not cancelled | `confetti-celebration.tsx` | open |
| FE-8 | Side effects inside a `setState` updater | `coach-onboarding-checklist.tsx` | open |
| FE-9 | Derived state mirrored in effects (`guardian-calendar`, `log-form`, `log-detail`), including an unguarded async review write | dashboard components | open |
| FE-10 | Calendar day cells are mouse-only `<div>`s | `guardian-calendar*.tsx` | open |
| FE-11 | Index-as-key on editable slot lists | slot sections | open |
| FE-14 | `log-form` today-fetch swallows errors | `log-form.tsx` | open |
| FE-15 / FE-16 | `User` type outside `types/dashboard.ts`; guardian calendar response type drift | `hooks/use-auth.ts`, `guardian-dashboard.tsx` | open |
| FE-17 / E5 | No `apiMutate` helper; ~25 components duplicate fetch/toast error code; 1 `useMutation` in the codebase | components | deferred |
| FE-18 | Invite forms can double-submit login | `app/invite/[token]/page.tsx` | open |
| FE-19 | Comment thread missing from `LogDetail` | `log-detail.tsx` | open |
| FE-20 | Perf/hygiene cluster (memo never hits, `useClickOutside` re-subscribes, `useMediaQuery` SSR flash, `onMouseOver`) | various | open |
| ARCH | God component `app/dashboard/page.tsx` (8 queries, 27-prop feed, mirrored `activeGroupId`) | `app/dashboard/page.tsx` | deferred (see audit §1.4) |

## Database schema, indexes, migrations

- **Index work (open):** move the ad-hoc `invites` indexes from `groups/[groupId]/invites/route.ts` into
  `lib/ensure-indexes.ts`.
  - Add indexes: `pending_signups.token`, `password_reset_tokens.token`, `guardianPendingAthletes`
    (`guardianId`, `athleteEmail`), `guardianLinks.athleteId`.
  - Drop redundant prefixes: `logs {userId:1}` and `skippedDays {userId:1}`, `{userId:1, dayOfWeek:1}`.
  - Add TTL indexes on `pending_signups`, `password_reset_tokens`, `invites` (not `checkins`).
  - Low priority: deletion-path scans on `comments.authorId`, `checkins.headCoachId`, `attendance.groupId`.
- **Migrations M1–M3 (open):**
  - M1: backfill legacy `users.groupId` and remove the last read, in `groups/[groupId]/invites`.
  - M2: head coach always in `coachIds`.
  - M3: `groupMemberships` becomes the single membership authority.
  - All of these are superseded if the Postgres move happens; see `docs/postgres-migration-design.md`.
- **INF-12 (open):** no migration convention (one ad-hoc script).

## Architecture / maintainability (deferred pending the Postgres decision)

See `docs/audit-2026-10.md` §1 and §4. Topics:
- `withApiRoute` wrapper and zod schemas;
- a single membership module;
- one `log-visibility` helper (the legacy rule is duplicated 11×);
- invite redeem / invite page de-duplication;
- dashboard data hook + context.

A data-access layer (Postgres plan, phase 1) would absorb most of these.

## Tooling & tests

| ID | Finding | Status |
|---|---|---|
| T-1 | E2E suite is a weak regression net: tautological tests, positive-only filters, zero permission tests, retries=2 hide flakes, dead cleanup code. Full report: `docs/e2e-test-assessment.md` | open |
| T-2 | Cypress sets the flags override as `__vercel_flags_overrides`, but `flags@4` reads `vercel-flag-overrides`, so "beta=true" in tests actually comes from the live Vercel FLAGS config | open |
| T-3 | Past "fix failing e2e" commits loosened assertions (e.g. `7ce1b63`) and disabled rate limiting outside prod (`50b4f05`) | note |
| INF-11 | No tests for `lib/log-filters.ts`, `subscription.ts`, `group-actions.ts`; no route-level tests | open |
| INF-9 | Unused deps (`zod`, `react-hook-form`, `@hookform/resolvers`), orphan `src/index.css`, stray `app/opengraph-image- prev.png`, committed `tsconfig.tsbuildinfo` | open |
