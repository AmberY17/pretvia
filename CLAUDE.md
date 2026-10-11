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
- **users:** `groupIds` (all memberships) + `activeGroupId` (selected group). The legacy singular `groupId` is no longer written; its last read is in `app/api/groups/[groupId]/invites/route.ts` (migration M1 in `docs/FINDINGS.md`).
- **groups:** `headCoachId` (owner) + `coachIds` (all coaches). The head coach is NOT guaranteed to be in `coachIds` — auth checks must test both (`canManageGroup()` in `lib/api-auth.ts` does). Stored types vary (string vs ObjectId), so compare via `.toString()`.
- **Membership has two sources of truth:** `users.groupIds` (member lists, log visibility — `lib/log-filters.ts`) and the `groupMemberships` collection (roles). `ensureGroupIds()` in `lib/group-actions.ts` patches drift. Keep both in sync when adding/removing members.
- `checkins.headCoachId` actually stores the *creating* coach, not the group's head coach.

### Other Gotchas
- **Coaches can join any group by its code** ("Join Another" in the sidebar) — intentional. They are added to `coachIds`. Join codes are only returned to that group's coaches.
- **Account deletion** removes groups the user *owns* (`headCoachId`); for groups they only coach, it just removes them from `coachIds`.
- Body fields that go into a Mongo filter must be type-checked as strings first (see `app/api/CLAUDE.md`) — an object like `{"$ne": null}` is a query operator.
- Sentry runs server + edge only (`sentry.server.config.ts`, `sentry.edge.config.ts`); there is no client config.

## Known Issues & Docs

Open bugs, deferred decisions and audit history live in **`docs/FINDINGS.md`** (single tracker, statuses per item). Don't add audit lists to the CLAUDE.md files — update the tracker instead.

| Doc | What it is |
|-----|-----------|
| `docs/FINDINGS.md` | Living tracker of all known issues (security, bugs, frontend, DB, tests) |
| `docs/audit-2026-10.md` | Full fresh-eyes audit write-up with refactor sketches |
| `docs/postgres-migration-design.md` | Proposed MongoDB → Postgres schema and migration plan (draft) |
| `docs/e2e-test-assessment.md` | Review of the Cypress suite's reliability and coverage |

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
