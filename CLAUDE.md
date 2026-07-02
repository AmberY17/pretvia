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
