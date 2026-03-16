# SWR → React Query Migration + Stale Data Bug Fixes

## Context

The project uses SWR (`^2.2.5`) across 11 files for client-side data fetching. As the app grows in complexity (cross-role views, group switching, infinite scroll, athlete transfers), SWR's manual `mutate()` approach has led to several stale data bugs where related caches aren't invalidated after mutations. Migrating to React Query (TanStack Query v5) gives us hierarchical query keys with prefix-based invalidation, first-class `useMutation` primitives, and makes it structurally harder to forget invalidations.

## Stale Data Bugs to Fix

| # | Severity | Bug | Location | Root Cause |
|---|----------|-----|----------|------------|
| 1 | CRITICAL | Athlete transfer/removal — logs still show transferred athlete's data | `app/dashboard/group/page.tsx:264-268,299-303` | `globalMutate("/api/logs", undefined, { revalidate: false })` clears cache but never refetches |
| 2 | CRITICAL | Group switch — tags and stats from old group persist | `app/dashboard/page.tsx:154-177` | `handleGroupChanged` missing `mutateTags()` and `mutateStats()` calls; logs use `revalidate: false` |
| 3 | MEDIUM | Log update — checkins/stats not refreshed | `components/main/dashboard/logs/hooks/use-dashboard-panel.ts:68-73` | `handleLogUpdated` only calls `mutateLogs` + `mutateTags`, missing `mutateCheckins`, `mutateAllCheckins`, `mutateStats` |
| 4 | MEDIUM | Log delete — allCheckins not refreshed | `use-dashboard-panel.ts:79-115` | `handleDeleteLog` missing `mutateAllCheckins()` |
| 5 | MEDIUM | Role CRUD — logs/tags not refreshed | `app/dashboard/group/page.tsx:156-224` | `handleAddRole`/`handleUpdateRole`/`handleDeleteRole` only call `mutateMembers()` |

## Migration Plan

### Step 1: Infrastructure Setup

**New files to create:**

1. **`lib/query-client.ts`** — Shared fetcher + QueryClient factory
   - `apiFetcher<T>(url: string): Promise<T>` — replaces both `urlFetcher` and `logsInfiniteFetcher`
   - `makeQueryClient()` — default `staleTime: 30_000` (matches existing `dedupingInterval`), `refetchOnWindowFocus: false`

2. **`lib/query-keys.ts`** — Centralized query key factory
   - Hierarchical keys: `queryKeys.logs.all` = `["logs"]`, `queryKeys.logs.list(filters)` = `["logs", "list", filters]`
   - Covers: `auth.session`, `logs.all/list`, `tags.all/byUser`, `members.all/byGroup`, `checkins.all/active/allSessions`, `stats.all/byUser`, `announcements.all/byGroup`, `comments.byLog`, `attendance.byCheckin`, `guardian.calendar`, `groups.coachGroups/myGroups/trainingSchedule`, `guardians.byAthlete`
   - This is the key mechanism for fixing bugs — `invalidateQueries({ queryKey: queryKeys.logs.all })` invalidates ALL log queries

3. **`components/query-provider.tsx`** — `"use client"` wrapper with `QueryClientProvider` + devtools

**Modify:** `app/layout.tsx` — Wrap children inside `<ThemeProvider>` with `<QueryProvider>`

**Install:** `pnpm add @tanstack/react-query @tanstack/react-query-devtools`

### Step 2: Auth Hook Migration

**File:** `hooks/use-auth.ts`
- Replace `useSWR("/api/auth/session", ...)` → `useQuery({ queryKey: queryKeys.auth.session, queryFn: ... })`
- Return `mutate` as `() => queryClient.invalidateQueries({ queryKey: queryKeys.auth.session })` for backward compat with `use-require-auth.ts`

**File:** `hooks/use-require-auth.ts` — No changes needed (calls `useAuth()` which maintains same interface)

### Step 3: Auth Form Components

**Files:** `components/auth/login-form.tsx`, `components/auth/signup-form.tsx`
- Replace `import { mutate } from "swr"` → `useQueryClient()`
- Replace `mutate("/api/auth/session", { user }, { revalidate: true })` → `queryClient.setQueryData(queryKeys.auth.session, { user })` then `queryClient.invalidateQueries({ queryKey: queryKeys.auth.session })`

**File:** `components/auth/signed-in-choice.tsx`
- Replace `mutate(() => true, undefined, { revalidate: false })` → `queryClient.clear()`

**File:** `app/invite/[token]/page.tsx`
- Replace `useSWR` for session → `useQuery`
- Replace `mutate("/api/auth/session")` → `queryClient.invalidateQueries({ queryKey: queryKeys.auth.session })`

### Step 4: Dashboard Panel Hook (fixes bugs 3 + 4)

**File:** `components/main/dashboard/logs/hooks/use-dashboard-panel.ts`

Change interface to accept `QueryClient` instead of individual mutate functions:
```
interface UseDashboardPanelParams {
  userId?: string;
  queryClient: QueryClient;
  logsQueryKey: readonly unknown[];  // for optimistic updates on infinite query
}
```

Fix `handleLogUpdated`:
- Add `queryClient.invalidateQueries({ queryKey: queryKeys.checkins.all })`
- Add `queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })`

Fix `handleDeleteLog`:
- Add `queryClient.invalidateQueries({ queryKey: queryKeys.checkins.all })` (covers both checkins + allCheckins)
- Optimistic update uses `queryClient.setQueryData(logsQueryKey, ...)` with rollback via `queryClient.invalidateQueries`

### Step 5: Main Dashboard Page (fixes bug 2)

**File:** `app/dashboard/page.tsx`

Replace all 8 SWR hooks:
- `useSWRInfinite` for logs → `useInfiniteQuery` with `getNextPageParam: (lastPage) => lastPage.nextCursor`, `initialPageParam: null`
- 7x `useSWR` (tags, members, checkins, allCheckins, stats, announcements, myGroups) → `useQuery` with `enabled` option for conditional fetching

Fix `handleGroupChanged` (bug 2):
```typescript
const handleGroupChanged = useCallback((newGroupId?: string) => {
  setIsGroupSwitching(true);
  if (newGroupId !== undefined) setActiveGroupId(newGroupId);
  queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
  queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });          // FIX
  queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });         // FIX
  queryClient.invalidateQueries({ queryKey: queryKeys.checkins.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
  handlers.clearAllOnGroupChange();
}, [...]);
```

Fix `handleLogout`:
- Replace `globalMutate(() => true, ...)` → `queryClient.clear()`

Remove the manual `setSize(1)` / `prevLogsUrlRef` pattern — React Query's key-based caching handles this automatically when `logsUrl` or `activeGroupId` changes.

### Step 6: Group Management Page (fixes bugs 1 + 5)

**File:** `app/dashboard/group/page.tsx`

Replace 3x `useSWR` → `useQuery` (coachGroups, members, trainingSchedule)

Fix `handleRemoveAthlete` + `handleTransfer` (bug 1):
```typescript
// After successful API call:
queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });       // FIX: actually revalidates
queryClient.invalidateQueries({ queryKey: queryKeys.checkins.all });   // FIX: was missing
queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });      // FIX: was missing
```

Fix role CRUD (bug 5) — `handleAddRole`, `handleUpdateRole`, `handleDeleteRole`:
```typescript
queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });       // FIX
queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });       // FIX
```

### Step 7: Remaining Components

**`app/dashboard/attendance/page.tsx`** — `useSWR` → `useQuery`, mutate → `invalidateQueries`

**`components/main/dashboard/logs/comment-section.tsx`** — `useSWR` → `useQuery`, 4 `mutate()` calls → `invalidateQueries`

**`components/main/guardian/guardian-dashboard.tsx`** — `useSWR` with `keepPreviousData: true` → `useQuery` with `placeholderData: keepPreviousData` (import from `@tanstack/react-query`)

**`components/main/coach/groups/guardians-popover.tsx`** — `useSWR` → `useQuery`, mutate → `invalidateQueries`

### Step 8: Cleanup

- Delete `lib/swr-utils.ts`
- `pnpm remove swr`
- Update `CLAUDE.md` "Data Fetching" section to reference React Query
- Grep for any remaining `swr` imports

## Key Files to Modify

| File | Changes |
|------|---------|
| `lib/query-client.ts` | **NEW** — fetcher + QueryClient factory |
| `lib/query-keys.ts` | **NEW** — centralized query key factory |
| `components/query-provider.tsx` | **NEW** — QueryClientProvider wrapper |
| `app/layout.tsx` | Add `<QueryProvider>` |
| `hooks/use-auth.ts` | SWR → useQuery |
| `components/auth/login-form.tsx` | global mutate → queryClient |
| `components/auth/signup-form.tsx` | global mutate → queryClient |
| `components/auth/signed-in-choice.tsx` | global mutate → queryClient.clear() |
| `app/invite/[token]/page.tsx` | SWR → useQuery |
| `components/main/dashboard/logs/hooks/use-dashboard-panel.ts` | New interface + bug fixes 3,4 |
| `app/dashboard/page.tsx` | 8 SWR hooks → useQuery/useInfiniteQuery + bug fix 2 |
| `app/dashboard/group/page.tsx` | 3 SWR hooks → useQuery + bug fixes 1,5 |
| `app/dashboard/attendance/page.tsx` | SWR → useQuery |
| `components/main/dashboard/logs/comment-section.tsx` | SWR → useQuery |
| `components/main/guardian/guardian-dashboard.tsx` | SWR → useQuery with keepPreviousData |
| `components/main/coach/groups/guardians-popover.tsx` | SWR → useQuery |
| `lib/swr-utils.ts` | **DELETE** |

## Verification

1. **Auth flow:** Login → verify session loads → logout → verify cache clears → login again
2. **Group switching:** Switch groups → verify logs, tags, stats, announcements, checkins all refresh (bug 2)
3. **Athlete transfer:** Transfer athlete → verify logs feed no longer shows their entries without page refresh (bug 1)
4. **Athlete removal:** Remove athlete → verify same as transfer (bug 1)
5. **Log CRUD:** Create/edit/delete log → verify tags, stats, checkins all update (bugs 3, 4)
6. **Role CRUD:** Add/rename/delete role → verify logs and tags refresh (bug 5)
7. **Infinite scroll:** Scroll to load more logs → verify pagination works
8. **Guardian calendar:** Switch month → verify `keepPreviousData` prevents flash
9. **Comments:** Add/edit/delete comment → verify updates
10. **Run existing tests:** `pnpm lint`, `pnpm test`, `pnpm e2e:ci`
