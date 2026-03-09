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
- SWR for all client data fetching
- Fetchers in `lib/swr-utils.ts`: `urlFetcher` (single), `logsInfiniteFetcher` (paginated)
- `useSWR` for single resources, `useSWRInfinite` for paginated feeds

## Testing
After editing or adding a feature, update or add the related E2E and/or unit tests.
See `cypress/CLAUDE.md` for E2E conventions.

## Large Files (refactoring candidates)
- `app/api/groups/route.ts` (528 lines)
- `app/api/invites/[token]/redeem/route.ts` (497 lines)
- `app/api/logs/route.ts` (438 lines)
- `components/dashboard/group/group-athletes-section.tsx` (482 lines)
- `components/dashboard/sidebar/sidebar-profile.tsx` (436 lines)
- `components/dashboard/logs/comment-section.tsx` (408 lines)
