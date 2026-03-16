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
Collections: `users`, `groups`, `logs`, `comments`, `checkins`, `announcements`, `tags`, `invites`, `skippedDays`, `attendance`

### Key Gotcha: Dual Fields
Some documents have both singular and array versions of relationship fields:
- `groupId` / `groupIds` — user's group membership
- `coachId` / `coachIds` — group's coaches

`canManageGroup()` handles both. Always check both when querying.

## Directory Map

| Directory | Purpose |
|-----------|---------|
| `app/api/` | REST API route handlers |
| `app/auth/` | Login/signup pages |
| `app/dashboard/` | Main dashboard (layout + sub-routes) |
| `components/ui/` | shadcn/ui primitives |
| `components/dashboard/` | Feature components |
| `components/dashboard/shared/` | Reusable components (DeleteConfirmDialog, VisibilityBadge, TagPill) |
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
- `components/dashboard/group/athlete-row.tsx` — per-athlete row (role dropdown, transfer, remove)
- `components/dashboard/group/guardians-popover.tsx` — guardian list + invite popover
- `components/dashboard/logs/comment-item.tsx` — individual comment bubble (exports `Comment` type)
- `components/dashboard/sidebar/group-switcher.tsx` — group switcher dropdown
- `components/dashboard/sidebar/group-action-form.tsx` — join/create group form (`forceOpen` prop for "Join Another" flow)
