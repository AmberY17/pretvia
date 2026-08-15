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

## Frontend Audit Findings (2026-07-07) — open work

Full audit of `components/`, `hooks/`, `app/dashboard/` (React Query data flow, hooks hygiene, type/contract consistency, dead code). Not yet fixed; ordered by priority. All writes are raw `fetch` + manual `queryClient.invalidateQueries` (no `useMutation`), so invalidation completeness is manual and error-prone — that's the theme of the data-layer findings. TanStack **prefix** matching means the `*.all` invalidations correctly reach fully-parameterized keys, so the real defects are *which* prefixes get invalidated and error/race handling, not the key structure.

**High**
1. ~~**Transient session-fetch error logs the user out.**~~ **DONE (2026-08-14)** — `useRequireAuth()` now destructures `isError` from `useAuth()` and skips the unauthenticated-redirect branch when it's set, so a transient 500 on `/api/auth/session` no longer bounces a logged-in user to `/auth`.
2. ~~**Nested component definitions remount a subtree every render.**~~ **DONE (2026-08-14)** — `AthletesPopover`/`ViewModePopover` are now hoisted to module scope in `guardian-dashboard-content.tsx`, taking `open`/`onOpenChange` and the relevant data/handlers as props instead of closing over component state, so their identity is stable across renders.

**Medium — stale cache / data integrity**
3. ~~**`handleAssignRoles` doesn't invalidate the logs feed.**~~ **DONE (2026-08-14)** — it now also invalidates `tags.all` + `logs.all` after `mutateMembers()`, matching its three sibling role handlers.
4. ~~**Creating a group doesn't refresh the group lists.**~~ **DONE (2026-08-14)** — `club-group-section.tsx` now also invalidates `groups.coachGroups`/`groups.myGroups` alongside `club.overview`/`auth.session`.
5. ~~**`logsFetcher` never checks `r.ok`.**~~ **DONE (2026-08-14)** — it now checks `r.ok` and throws `data?.error ?? "Request failed"`, mirroring `apiFetcher`.
6. ~~**Coach "Move to" is a non-atomic DELETE-then-POST.**~~ **DONE (2026-08-10)** — `coach-row.tsx` now issues a single `PATCH /api/groups/[groupId]/coaches/[coachId]` with `{ targetGroupId }`. The route performs the remove and the add inside a transaction (falling back to unwrapped writes only on "transactions unsupported", as the account-deletion cascade does), and requires the caller to head-coach **both** groups so this can't be used to push a coach into someone else's group.

**Medium — effects & lifecycle**
7. ~~**Confetti rAF loop never cancelled.**~~ **DONE (2026-08-14)** — the rAF id is tracked in a ref and `cancelAnimationFrame`'d in the effect's cleanup alongside the existing `clearTimeout`.
8. ~~**Side effects inside a `setState` updater.**~~ **DONE (2026-08-14)** — `markAndNavigate` now computes `next` outside the updater and runs `localStorage.setItem`/the completion timeout in the handler body; the timeout id is stored in a ref and cleared on unmount.
9. **Derived-state-in-effect antipatterns** (extra render + stale-value window): `guardian-calendar.tsx:22-35` mirrors the `month` prop into `current` state via effect (the weekly sibling does it correctly with `useMemo` — copy that); `log-form.tsx:77-95` re-syncs all six fields from props in an effect (in "new" mode a check-in prefill that changes `checkinId` can wipe the user's typed emoji/notes/tags); `log-detail.tsx:26-58` mirrors `log.reviewStatus` and does `setState` after an `await fetch` with no abort/mounted guard (out-of-order review writes on fast panel switches). Fix: derive during render / key-based remount; add an `AbortController` to the review write.

**Medium — accessibility & list identity**
10. **Clickable `<div>` day cells, mouse-only.** `guardian-calendar.tsx:117-119` and `guardian-calendar-weekly.tsx:101-103` cycle emojis via `onClick` on a `<div>` with no `role`/`tabIndex`/`onKeyDown` — keyboard and screen-reader users can't activate it. Fix: use a `<button>` (or add role + keyboard handling).
11. **`index`-as-key on editable, deletable lists.** `account-training-slots-section.tsx:84` and `group-training-schedule-section.tsx:39` key rows by array index while `onRemoveSlot(index)` deletes from the middle; the wheel pickers hold internal popover state keyed to position, so deleting a row above an open picker attaches its UI state to the wrong row. Fix: give slots a stable id for the key.

**Low — hygiene, dead code, consistency**
12. ~~**Dead code:** `app/sentry-example-page/page.tsx` is orphaned and ships a "Test Sentry" page to production.~~ **DONE (2026-08-10)** — removed together with `app/api/sentry-example-api/route.ts` (API-25).
13. **Silent read failures:** most dashboard reads (`app/dashboard/page.tsx` tags/members/checkins/stats/announcements, `comment-section.tsx`, `guardians-popover.tsx`, `attendance/page.tsx`) never destructure `isError`; failures fall through to `?? []` and render as "empty," indistinguishable from no data. `club/page.tsx:23-65` is the correct counter-example. Fix: surface a retry/error affordance (a shared helper would help — see 17).
14. **`log-form` today-fetch swallows errors:** `log-form.tsx:117` `.catch(() => {})` — if `/api/logs/today` fails, the "already logged today" guard silently disappears and duplicate submits are only stopped later by the API 409.
15. **`User` type lives in `hooks/use-auth.ts`, not `types/dashboard.ts`** (violates the shared-types rule) and omits `linkedAthleteIds`, which `guardian-dashboard.tsx:85` reaches via a cast `(user as { linkedAthleteIds?: string[] })` that defeats type-checking. Fix: move `User` to the shared types file and add the field.
16. **Guardian calendar inline `useQuery` type drifts from `CalendarData`:** `guardian-dashboard.tsx:37-46` redeclares the response shape and omits `trainingDayDates` (which the API returns and `guardian-dashboard-content.tsx` reads). Two ad-hoc API-shape types for one response, neither in `types/dashboard.ts`.
17. **Mutation-error boilerplate duplicated across ~25 components** (`fetch` → `res.json()` → `toast.error(data.error || "…")`, ~59 lines/25 files). There's a shared read helper (`apiFetcher`) but no `apiMutate`; one helper would standardize error UX and remove the repetition. Related: local date formatting duplicated (`log-form.tsx:31-43` `getLocalTimestamp`/`toLocalTimestamp`; repeated `format(new Date(log.timestamp), "h:mm a")` in `log-card`/`log-detail`/`attendance-session-dropdown`) despite `lib/date-utils.ts`.
18. ~~**Login double-submit inside invite forms.**~~ **DONE (2026-08-14)** — `InviteAthleteForm`/`InviteCoachForm`/`InviteParentForm` each track a local `isLoggingIn` state, set around the `/api/auth/login` fetch, and include it in the submit button's `disabled` (and spinner) expression alongside `redeeming`.
19. **Comments render in `LogCard` (`log-card.tsx:169`) but not in `LogDetail`** — the feedback thread is absent from the detail panel, an inconsistent surface for the same entity.
20. **Perf/hygiene cluster:** `dashboard-sidebar.tsx:100-177` `coachSections` `useMemo` never memoizes because `useDashboardFilters` returns fresh `filters`/`handlers` object literals each render; `useClickOutside` (`hooks/use-click-outside.ts:23`) re-subscribes every render due to inline-arrow deps; `useMediaQuery` (`hooks/use-media-query.ts:4`) initializes `false` on SSR → possible hydration flash; `log-card.tsx:53` uses `onMouseOver` (fires per child) instead of `onMouseEnter`.

_Themes for a future fix pass: findings 1/5/13/14/17 all stem from no uniform failure surface (a shared `apiMutate` + consistent `isError` reads would clear several); 9/11 are the same "derive/key, don't mirror" root cause; 12 pairs with API-audit finding 25. Quick low-risk wins: 1, 2, 3, 5, 7, 12._
