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
1. **Transient session-fetch error logs the user out.** `hooks/use-require-auth.ts:17-24` reads only `user`/`isLoading` from `useAuth()`, never `isError`. `apiFetcher` throws on any non-2xx/network failure → `data === undefined` → `user === null` → the effect pushes an authenticated user to `/auth`. A blip or a 500 on `/api/auth/session` bounces a logged-in user to sign-in (React Query's 3 default retries mitigate but don't eliminate). Fix: don't redirect when `isError` is set.
2. **Nested component definitions remount a subtree every render.** `components/main/guardian/guardian-dashboard-content.tsx:73` and `:122` define `AthletesPopover`/`ViewModePopover` *inside* the render body and use them as `<AthletesPopover />`. New function identity each render → React unmounts/remounts the whole popover subtree. Checking an athlete → `onSelectedPairsChange` re-renders the parent → the open Popover tears down mid-selection (flicker/close, lost focus/scroll). Fix: hoist to module scope (or inline the JSX, not as a component).

**Medium — stale cache / data integrity**
3. **`handleAssignRoles` doesn't invalidate the logs feed.** `app/dashboard/group/page.tsx:254` calls only `mutateMembers()`, while its three sibling role handlers (add/update/delete, lines 180-181/208-209/233-234) each also invalidate `tags.all` + `logs.all`. Since the feed is filterable by `roleId`, changing an athlete's role leaves their logs under the old role filter for up to the 30s `staleTime`. Fix: mirror the siblings.
4. **Creating a group doesn't refresh the group lists.** `components/main/coach/club/club-group-section.tsx:41-42` invalidates `club.overview` + `auth.session` but not `groups.coachGroups`/`groups.myGroups` (fetched in `group/page.tsx`). A new group is missing from the Manage-Group transfer dropdown until `staleTime` lapses. Fix: also invalidate the group-list keys.
5. **`logsFetcher` never checks `r.ok`.** `lib/query-client.ts:12-23` (unlike `apiFetcher` at `:6`) does `fetch(...).then(r => r.json())` with no status check → a 500 yields `{ logs: [] }`, rendering the normal "no logs" empty state instead of an error. Fix: check `r.ok` and throw like `apiFetcher`.
6. ~~**Coach "Move to" is a non-atomic DELETE-then-POST.**~~ **DONE (2026-08-10)** — `coach-row.tsx` now issues a single `PATCH /api/groups/[groupId]/coaches/[coachId]` with `{ targetGroupId }`. The route performs the remove and the add inside a transaction (falling back to unwrapped writes only on "transactions unsupported", as the account-deletion cascade does), and requires the caller to head-coach **both** groups so this can't be used to push a coach into someone else's group.

**Medium — effects & lifecycle**
7. **Confetti rAF loop never cancelled.** `components/main/dashboard/layout/confetti-celebration.tsx:50-69` self-schedules `requestAnimationFrame(frame)` for 2.5s; cleanup (`:73`) only clears the dismiss timer. Dismissing early keeps firing global confetti bursts for up to 2.5s after the overlay is gone. Fix: track the rAF id and `cancelAnimationFrame` in cleanup.
8. **Side effects inside a `setState` updater.** `components/main/dashboard/layout/onboarding/coach-onboarding-checklist.tsx:91-103` calls `localStorage.setItem` and `setTimeout(onComplete, 0)` *inside* the `setChecks` updater. React 19 Strict Mode double-invokes updaters → writes/`onComplete` run twice, and the timeout is uncleaned (fires after `router.push` unmounts). Fix: move side effects into the handler body; clear the timeout.
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
18. **Login double-submit inside invite forms:** `app/invite/[token]/page.tsx:446-461` (and coach/parent variants) fire `/api/auth/login` before `redeem()` sets `redeeming`, so the submit button isn't disabled during the login request — a double-click fires two logins.
19. **Comments render in `LogCard` (`log-card.tsx:169`) but not in `LogDetail`** — the feedback thread is absent from the detail panel, an inconsistent surface for the same entity.
20. **Perf/hygiene cluster:** `dashboard-sidebar.tsx:100-177` `coachSections` `useMemo` never memoizes because `useDashboardFilters` returns fresh `filters`/`handlers` object literals each render; `useClickOutside` (`hooks/use-click-outside.ts:23`) re-subscribes every render due to inline-arrow deps; `useMediaQuery` (`hooks/use-media-query.ts:4`) initializes `false` on SSR → possible hydration flash; `log-card.tsx:53` uses `onMouseOver` (fires per child) instead of `onMouseEnter`.

_Themes for a future fix pass: findings 1/5/13/14/17 all stem from no uniform failure surface (a shared `apiMutate` + consistent `isError` reads would clear several); 9/11 are the same "derive/key, don't mirror" root cause; 12 pairs with API-audit finding 25. Quick low-risk wins: 1, 2, 3, 5, 7, 12._
