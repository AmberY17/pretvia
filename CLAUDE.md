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
- Every protected endpoint: `getSession()` check first → 401 if missing
- Coach-gated endpoints: `canManageGroup(db, userId, groupId)` from `lib/api-auth.ts` → 403
- DB access: `const db = await getDb()` from `lib/mongodb.ts`
- ObjectId validation: `safeObjectId(id)` from `lib/objectid.ts` → returns null for invalid
- Error shape: always `{ error: string }` with appropriate HTTP status
- Try/catch with `console.error("METHOD /api/path:", err)` and 500 response

### Database (MongoDB)
Collections: `users`, `groups`, `logs`, `comments`, `checkins`, `announcements`, `tags`, `invites`, `skippedDays`, `attendance`

### Key Gotcha: Dual Fields
Some documents have both singular and array versions of relationship fields:
- `groupId` / `groupIds` — user's group membership
- `coachId` / `coachIds` — group's coaches

`canManageGroup()` handles both: `group.coachIds ?? (group.coachId ? [group.coachId] : [])`. Always check both when querying.

## Directory Purposes

| Directory | Purpose |
|-----------|---------|
| `app/api/` | REST API route handlers (Next.js App Router) |
| `app/auth/` | Login/signup pages |
| `app/dashboard/` | Main dashboard (layout + sub-routes) |
| `components/ui/` | shadcn/ui primitives (Button, Dialog, etc.) |
| `components/dashboard/` | Feature components (logs, filters, sidebar, group) |
| `components/dashboard/shared/` | Reusable components (DeleteConfirmDialog, VisibilityBadge, TagPill) |
| `hooks/` | Custom React hooks (one per file, `use-` prefix) |
| `lib/` | Server/client utilities (auth, db, streak calc, date/time) |
| `types/dashboard.ts` | All shared TypeScript types — never duplicate these |
| `cypress/e2e/` | E2E tests organized by feature area |

## Component Conventions
- Files: kebab-case. Exports: PascalCase named exports (no default exports)
- `"use client"` only when component uses hooks/browser APIs
- `cn()` from `@/lib/utils` for class merging
- Import alias: `@/*` → project root
- Props interface: `ComponentNameProps`

## Styling
- Tailwind utility classes only (no CSS modules)
- Semantic color tokens: `primary`, `secondary`, `destructive`, `muted`, `accent`, `checkin`
- Dark mode: `class` strategy. Color themes: `[data-theme="..."]` on `<html>`
- `cn()` for conditional classes, `cva` for variant styles

## Key Hooks
- `useAuth()` — current session + mutate
- `useRequireAuth()` — page-level auth guard (redirects if unauthenticated)
- `useDashboardFilters()` — filter state for dashboard feed
- `useTrainingSlots()` — CRUD for training slot arrays

## Testing
- **E2E:** Cypress in `cypress/e2e/` — 9 feature areas, 20 spec files
- **Unit:** Vitest in `__tests__/` or `*.test.ts` files
- E2E uses `cy.session()` for login caching, credentials from `cypress.env.json`
- Prefer semantic locators: `cy.contains()`, `findByRole()`, `data-testid`
- Run E2E: `pnpm e2e:ci` (sets `SKIP_EMAIL=1`, starts dev server automatically)

## Data Fetching (Client)
- SWR for all client data fetching
- Fetchers in `lib/swr-utils.ts`: `urlFetcher` (single), `logsInfiniteFetcher` (paginated)
- `useSWR` for single resources, `useSWRInfinite` for paginated feeds

## Large Files (refactoring candidates)
- `app/api/groups/route.ts` (528 lines)
- `app/api/invites/[token]/redeem/route.ts` (497 lines)
- `app/api/logs/route.ts` (438 lines)
- `components/dashboard/group/group-athletes-section.tsx` (482 lines)
- `components/dashboard/sidebar/sidebar-profile.tsx` (436 lines)
- `components/dashboard/logs/comment-section.tsx` (408 lines)
