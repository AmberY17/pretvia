# Components — Pretvia

## Conventions

- **Files:** kebab-case (`log-card.tsx`)
- **Exports:** PascalCase named exports — no default exports
- **`"use client"`** only when the component uses hooks or browser APIs
- **Props interface:** named `ComponentNameProps`
- **Import alias:** `@/*` → project root

## Styling

- Tailwind utility classes only — no CSS modules
- `cn()` from `@/lib/utils` for conditional class merging
- `cva` for variant-based styles
- Semantic color tokens: `primary`, `secondary`, `destructive`, `muted`, `accent`, `checkin`
- Dark mode: `class` strategy on `<html>`
- Color themes: `[data-theme="..."]` on `<html>`

## Key Hooks

- `useAuth()` — current session + mutate
- `useRequireAuth()` — page-level auth guard (redirects if unauthenticated)
- `useDashboardFilters()` — filter state for dashboard feed
- `useTrainingSlots()` — CRUD for training slot arrays

## Directory Structure

| Directory | Contents |
|-----------|---------|
| `components/ui/` | shadcn/ui primitives (Button, Dialog, etc.) — don't modify directly |
| `components/main/` | Feature components organized by role (coach, guardian, dashboard, account) |
| `components/main/shared/` | Shared across roles: DeleteConfirmDialog, EmptyStateCard, EmojiPicker, etc. |

## Shared Types

All shared TypeScript types live in `types/dashboard.ts` — never duplicate them in component files.
