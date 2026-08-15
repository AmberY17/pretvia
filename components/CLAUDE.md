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
9. ~~**Derived-state-in-effect antipatterns.**~~ **MOSTLY DONE (2026-08-15)** — `guardian-calendar.tsx` now derives `current` from the `month` prop with `useMemo` (dropped the state+effect mirror, matching the weekly sibling). `log-detail.tsx`'s auto-review effect now uses an `AbortController` (aborted in cleanup, `AbortError` caught silently), so a fast log-switch mid-fetch can no longer write the wrong log's review state. **Left as-is:** `log-form.tsx:76-95` still re-syncs fields from `editLog`/`prefillTimestamp` in an effect (removed only the dead `checkinId` dependency) — this one is inherent to the edit/prefill/blank reset semantics, not a pure derive, so a full key-based remount was judged a bigger behavioral change than the rest of this finding.

**Medium — accessibility & list identity**
10. ~~**Clickable `<div>` day cells, mouse-only.**~~ **DONE (2026-08-15)** — both `guardian-calendar.tsx` and `guardian-calendar-weekly.tsx` now render a `<button type="button">` (same classes, no visual change) when a cell is interactive (`hasMultiple`), and a plain `<div>` otherwise — keyboard/screen-reader users get native button semantics for free.
11. ~~**`index`-as-key on editable, deletable lists.**~~ **DONE (2026-08-15)** — both `account-training-slots-section.tsx` and `group-training-schedule-section.tsx` now key rows by `` `${dayOfWeek}:${time}` `` instead of `index`. `onRemoveSlot(index)`/`onUpdateSlot(index, ...)` still operate on array position (unchanged) — only the React key changed, so deleting a row no longer reattaches an open wheel-picker's state to the wrong row. Note: since `addSlot()` always creates a fresh `{dayOfWeek: 1, time: "09:00"}` slot, two freshly-added-but-unedited rows can briefly share a key; this is harmless because such rows are visually and functionally identical.

**Low — hygiene, dead code, consistency**
12. ~~**Dead code:** `app/sentry-example-page/page.tsx` is orphaned and ships a "Test Sentry" page to production.~~ **DONE (2026-08-10)** — removed together with `app/api/sentry-example-api/route.ts` (API-25).
13. ~~**Silent read failures.**~~ **DONE (2026-08-15)** — `app/dashboard/page.tsx` (all six queries), `comment-section.tsx`, `guardians-popover.tsx`, and `attendance/page.tsx` (both queries) now destructure `isError` and toast a "Couldn't load X. Try refreshing the page." on failure, alongside their existing loading/empty UI (not replacing it) — `club/page.tsx`'s `error`-branch pattern was the model but a toast was used here since these don't have a dedicated page-level error slot.
14. ~~**`log-form` today-fetch swallows errors.**~~ **DONE (2026-08-15)** — the `.catch(() => {})` now logs the error via `console.error`; `todayLoading` still resolves to "not blocked" on failure (deliberately — this guard is a best-effort UX nicety backed by the API's real 409, not worth a page-level error for).
15. ~~**`User` type lives in `hooks/use-auth.ts`, not `types/dashboard.ts`.**~~ **DONE (2026-08-15)** — `User` (with `linkedAthleteIds?: string[]` added) now lives in `types/dashboard.ts`; `hooks/use-auth.ts` imports and re-exports it (`export type { User }`) so existing `import type { User } from "@/hooks/use-auth"` call sites are unaffected. `guardian-dashboard.tsx`'s cast is gone — it reads `user.linkedAthleteIds ?? []` directly.
16. ~~**Guardian calendar inline `useQuery` type drifts from `CalendarData`.**~~ **DONE (2026-08-15)** — `CalendarData` (including `trainingDayDates`) now lives in `types/dashboard.ts`; `guardian-dashboard.tsx`'s `useQuery` generic and `guardian-dashboard-content.tsx`'s local type both import it instead of redeclaring the shape.
17. ~~**Mutation-error boilerplate duplicated across ~25 components.**~~ **DONE (2026-08-15)** — added `apiMutate` to `lib/query-client.ts` (same `fetch`/parse/throw contract as `apiFetcher`, for POST/PATCH/DELETE); converted every identified call site except the four core auth forms (`login-form.tsx`, `signup-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`) and the inline `/api/auth/login` calls inside the invite forms, left alone as the highest-stakes flows in the app and out of scope for a mechanical sweep. Callers now `try { await apiMutate(...) } catch (e) { toast.error(e instanceof Error ? e.message : "...") }`, preserving each site's original fallback message and success-path logic. **Still open:** the local date-formatting duplication (`getLocalTimestamp`/`toLocalTimestamp`, repeated `format(..., "h:mm a")`) noted alongside this finding was not part of the sweep.
18. ~~**Login double-submit inside invite forms.**~~ **DONE (2026-08-14)** — `InviteAthleteForm`/`InviteCoachForm`/`InviteParentForm` each track a local `isLoggingIn` state, set around the `/api/auth/login` fetch, and include it in the submit button's `disabled` (and spinner) expression alongside `redeeming`.
19. ~~**Comments render in `LogCard` but not in `LogDetail`.**~~ **DONE (2026-08-15)** — `log-detail.tsx` now renders the same `<CommentSection>` block as `log-card.tsx` (gated on `log.visibility === "coach"`), taking new required `currentUserId`/`groupId` props threaded through from `dashboard-panel.tsx`'s two call sites (`user.id`/`user.activeGroupId`, same source `log-card.tsx` already uses via `dashboard-feed.tsx`).
20. ~~**Perf/hygiene cluster.**~~ **DONE (2026-08-15)** — `useDashboardFilters()` now wraps `filtersState` and `handlers` in `useMemo`, so `dashboard-sidebar.tsx`'s `coachSections` `useMemo` actually memoizes. `useClickOutside` holds the latest `onOutsideClick` in a ref (updated every render, effect deps drop the callback) so inline-arrow callers no longer cause an add/remove-listener churn every render — no call sites needed to change. `useMediaQuery` now lazily initializes `matches` from `window.matchMedia(query).matches` when `window` exists, removing the false-then-true hydration flash. `log-card.tsx` swapped `onMouseOver` for `onMouseEnter`.

_Themes for a future fix pass: findings 1/5/13/14/17 all stem from no uniform failure surface (a shared `apiMutate` + consistent `isError` reads would clear several); 9/11 are the same "derive/key, don't mirror" root cause; 12 pairs with API-audit finding 25. Quick low-risk wins: 1, 2, 3, 5, 7, 12._
