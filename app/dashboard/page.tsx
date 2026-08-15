"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetcher, logsFetcher } from "@/lib/query-client"
import { queryKeys } from "@/lib/query-keys"
import { toast } from "sonner"
import { useRequireAuth } from "@/hooks/use-require-auth"
import { useDashboardFilters } from "@/components/main/dashboard/filters/hooks/use-dashboard-filters"
import { useDashboardPanel } from "@/components/main/dashboard/logs/hooks/use-dashboard-panel"
import dynamic from "next/dynamic"
import { DashboardHeader } from "@/components/main/dashboard/layout"
import { OnboardingModal } from "@/components/main/dashboard/layout/onboarding/onboarding-modal"
import { LoadingScreen } from "@/components/loading-screen"

const DashboardSidebar = dynamic(() =>
  import("@/components/main/dashboard/layout/dashboard-sidebar").then((m) => m.DashboardSidebar),
)
const DashboardFeed = dynamic(() =>
  import("@/components/main/dashboard/layout/dashboard-feed").then((m) => m.DashboardFeed),
)
const DashboardPanel = dynamic(() =>
  import("@/components/main/dashboard/layout/dashboard-panel").then((m) => m.DashboardPanel),
)
const GuardianDashboard = dynamic(() =>
  import("@/components/main/guardian/guardian-dashboard").then((m) => m.GuardianDashboard),
)
import type { LogEntry, CheckinItem, TrainingSlot } from "@/types/dashboard"

export default function DashboardPage() {
  const { user, isLoading: authLoading, mutate: mutateAuth, loggingOutRef } = useRequireAuth()
  const queryClient = useQueryClient()
  const [isGroupSwitching, setIsGroupSwitching] = useState(false)
  const switchingGroupIdRef = useRef<string | undefined>(undefined)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  useEffect(() => {
    setActiveGroupId(user?.activeGroupId ?? null)
  }, [user?.activeGroupId])

  const { filters, handlers, logsUrl } = useDashboardFilters()

  const logsQueryKey = [...queryKeys.logs.all, "list", logsUrl, user?.id, activeGroupId] as const

  const {
    data: logsPagesData,
    isLoading: logsLoading,
    isError: logsIsError,
    fetchNextPage,
    hasNextPage: hasMoreLogs,
    isFetchingNextPage: logsValidating,
  } = useInfiniteQuery<{ logs: LogEntry[]; nextCursor: string | null }>({
    queryKey: logsQueryKey,
    queryFn: ({ pageParam }) => logsFetcher<LogEntry>(logsUrl, pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user,
  })

  const logs = (logsPagesData?.pages ?? []).flatMap((p) => p.logs) as LogEntry[]

  const { data: tagsData, isLoading: tagsLoading, isError: tagsIsError } = useQuery<{
    tags: { id: string; name: string }[]
  }>({
    queryKey: [...queryKeys.tags.all, user?.id, user?.activeGroupId],
    queryFn: () =>
      apiFetcher(
        user?.activeGroupId ? `/api/tags?groupId=${user.activeGroupId}` : "/api/tags",
      ),
    enabled: !!user,
  })

  const { data: membersData, isError: membersIsError } = useQuery<{
    members: { id: string; displayName: string; email: string; role: string }[]
    roles: { id: string; name: string }[]
    trainingScheduleTemplate?: TrainingSlot[]
  }>({
    queryKey: [...queryKeys.members.all, user?.id, user?.activeGroupId],
    queryFn: () => apiFetcher(`/api/groups?groupId=${user!.activeGroupId}`),
    enabled: user?.role === "coach" && !!user?.activeGroupId,
  })

  const {
    data: checkinsData,
    isLoading: checkinsLoading,
    isFetching: checkinsFetching,
    isError: checkinsIsError,
  } = useQuery<{
    checkins: CheckinItem[]
  }>({
    queryKey: [...queryKeys.checkins.all, "active", user?.id, user?.activeGroupId],
    queryFn: () => apiFetcher("/api/checkins"),
    enabled: !!user?.activeGroupId,
  })

  const { data: allCheckinsData, isError: allCheckinsIsError } = useQuery<{
    checkins: CheckinItem[]
  }>({
    queryKey: [...queryKeys.checkins.all, "allSessions", user?.id, user?.activeGroupId],
    queryFn: () => apiFetcher("/api/checkins?mode=all"),
    enabled: user?.role === "coach" && !!user?.activeGroupId,
  })

  const localDate = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  })()

  const { data: statsData, isLoading: statsLoading, isError: statsIsError } = useQuery<{
    totalLogs: number
    streak: number
    hasTrainingSlots: boolean
    canSkipToday: boolean
    skipDisabledReason: "no_training" | "already_skipped" | "already_logged" | null
  }>({
    queryKey: [...queryKeys.stats.all, user?.id, localDate, user?.activeGroupId],
    queryFn: () => {
      const params = new URLSearchParams({ localDate })
      if (user?.activeGroupId) params.set("groupId", user.activeGroupId)
      return apiFetcher(`/api/stats?${params.toString()}`)
    },
    enabled: user?.role === "athlete",
  })

  const {
    data: announcementData,
    isLoading: announcementLoading,
    isFetching: announcementFetching,
    isError: announcementIsError,
  } = useQuery<{
    announcements: {
      id: string
      text: string
      coachName: string
      coachId: string
      createdAt: string
    }[]
  }>({
    queryKey: [...queryKeys.announcements.all, user?.id, user?.activeGroupId],
    queryFn: () => apiFetcher("/api/announcements"),
    enabled: !!user?.activeGroupId,
  })

  // These queries silently rendered "empty" on failure (?? []) with no
  // distinction from "no data" — surface a toast alongside the existing
  // loading/empty UI rather than restructuring the render tree.
  const erroredQueries = [
    logsIsError && "logs",
    tagsIsError && "tags",
    membersIsError && "group members",
    checkinsIsError && "check-ins",
    allCheckinsIsError && "check-in sessions",
    statsIsError && "stats",
    announcementIsError && "announcements",
  ].filter((v): v is string => Boolean(v))
  const erroredQueriesKey = erroredQueries.join(",")
  useEffect(() => {
    if (!erroredQueriesKey) return
    toast.error(`Couldn't load ${erroredQueriesKey}. Try refreshing the page.`)
  }, [erroredQueriesKey])

  const handleLogout = useCallback(() => {
    loggingOutRef.current = true
    queryClient.clear()
    mutateAuth()
  }, [mutateAuth, queryClient])

  const { panelState, panelHandlers } = useDashboardPanel({
    userId: user?.id,
    queryClient,
    logsQueryKey,
  })

  const prevUserIdForFiltersRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (
      prevUserIdForFiltersRef.current !== undefined &&
      prevUserIdForFiltersRef.current !== user?.id
    ) {
      handlers.clearAllFilters()
    }
    prevUserIdForFiltersRef.current = user?.id
  }, [user?.id, handlers])

  // Close the detail panel if the selected log is no longer in the filtered results
  const panelStateRef = useRef(panelState)
  panelStateRef.current = panelState
  useEffect(() => {
    if (logsLoading) return
    const { panelMode, selectedLog } = panelStateRef.current
    if (panelMode === "view" && selectedLog && !logs.some((l) => l.id === selectedLog.id)) {
      panelHandlers.handleClosePanel()
    }
  }, [logs, logsLoading, panelHandlers.handleClosePanel])

  // BUG FIX #2: handleGroupChanged now invalidates tags and stats
  const handleGroupChanged = useCallback(
    (newGroupId?: string) => {
      setIsGroupSwitching(true)
      switchingGroupIdRef.current = user?.activeGroupId ?? undefined
      if (newGroupId !== undefined) {
        setActiveGroupId(newGroupId)
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.session })
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.checkins.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all })
      handlers.clearAllOnGroupChange()
    },
    [queryClient, handlers, setIsGroupSwitching, user?.activeGroupId],
  )

  useEffect(() => {
    if (!isGroupSwitching) return
    if (!user?.activeGroupId || user.activeGroupId === switchingGroupIdRef.current) return
    if (announcementLoading || checkinsLoading) return
    setIsGroupSwitching(false)
  }, [isGroupSwitching, user?.activeGroupId, announcementLoading, checkinsLoading])

  const { data: myGroupsData } = useQuery<{
    groups: {
      id: string
      name: string
      code: string
      headCoachId: string
      trainingScheduleUpdatedAt?: string | null
    }[]
  }>({
    queryKey: [...queryKeys.groups.myGroups, user?.id],
    queryFn: () => apiFetcher("/api/groups?mode=my-groups"),
    enabled: !!user,
  })

  useEffect(() => {
    if (!user || user.role !== "athlete") return
    if (!myGroupsData?.groups?.length) return
    if (typeof window === "undefined") return

    try {
      const key = "pretvia-group-schedule-seen"
      const stored = window.localStorage.getItem(key)
      const seen: Record<string, string> = stored ? JSON.parse(stored) : {}
      const updatedSeen: Record<string, string> = { ...seen }

      myGroupsData.groups.forEach((g) => {
        if (!g.trainingScheduleUpdatedAt) return
        const updatedAt = new Date(g.trainingScheduleUpdatedAt).getTime()
        if (Number.isNaN(updatedAt)) return
        const lastSeen = seen[g.id] ? new Date(seen[g.id]).getTime() : 0
        if (!lastSeen || updatedAt > lastSeen) {
          toast.info(`Your coach updated the training schedule for ${g.name}.`)
          updatedSeen[g.id] = g.trainingScheduleUpdatedAt
        }
      })

      window.localStorage.setItem(key, JSON.stringify(updatedSeen))
    } catch {
      // ignore storage errors
    }
  }, [user, myGroupsData])

  if (authLoading || !user) {
    return <LoadingScreen message="Loading dashboard..." />
  }

  if (user.role === "guardian") {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <DashboardHeader user={user} onLogout={handleLogout} />
        <GuardianDashboard user={user} onLogout={handleLogout} />
      </div>
    )
  }

  const tags = tagsData?.tags ?? []
  const tagNames = tags.map((t) => t.name)
  const athletes = (membersData?.members ?? []).filter((m) => m.role !== "coach")
  const groupRoles = membersData?.roles ?? []
  const sessions = (allCheckinsData?.checkins ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    sessionDate: c.sessionDate,
    checkedInCount: c.checkedInCount,
    totalAthletes: c.totalAthletes,
  }))

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader user={user} onNewLog={panelHandlers.handleNewLog} onLogout={handleLogout} />
      <OnboardingModal user={user} />

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          user={user}
          onLogout={handleLogout}
          onGroupChanged={handleGroupChanged}
          filters={filters}
          handlers={handlers}
          tags={tags}
          sessions={sessions}
          athletes={athletes}
          groupRoles={groupRoles}
          isLoading={tagsLoading}
          statsLoading={statsLoading}
          stats={
            user.role === "athlete"
              ? {
                  totalLogs: statsData?.totalLogs ?? 0,
                  streak: statsData?.streak ?? 0,
                  hasTrainingSlots: statsData?.hasTrainingSlots ?? false,
                  canSkipToday: statsData?.canSkipToday ?? false,
                  skipDisabledReason: statsData?.skipDisabledReason ?? null,
                }
              : undefined
          }
          onMutateStats={() => queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })}
        />

        <DashboardFeed
          user={user}
          logs={logs}
          tags={tags}
          athletes={athletes}
          groupRoles={groupRoles}
          filters={filters}
          handlers={handlers}
          onViewLog={panelHandlers.handleViewLog}
          onEditLog={panelHandlers.handleEditLog}
          onDeleteLog={panelHandlers.handleDeleteLog}
          onCheckinLog={panelHandlers.handleCheckinLog}
          onNewLog={panelHandlers.handleNewLog}
          onClosePanel={panelHandlers.handleClosePanel}
          panelMode={panelState.panelMode}
          announcements={announcementData?.announcements ?? []}
          checkins={checkinsData?.checkins ?? []}
          announcementLoading={isGroupSwitching || announcementLoading || announcementFetching}
          checkinsLoading={isGroupSwitching || checkinsLoading || checkinsFetching}
          onEditCheckinLog={(logId) => {
            const log = logs.find((l) => l.id === logId)
            if (log) panelHandlers.handleEditLog(log)
          }}
          trainingScheduleTemplate={membersData?.trainingScheduleTemplate}
          isLoading={logsLoading}
          hasMoreLogs={hasMoreLogs ?? false}
          isLoadingMore={logsValidating}
          onLoadMore={() => fetchNextPage()}
          onMutateAnnouncement={() =>
            queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all })
          }
          onMutateCheckins={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.checkins.all })
          }}
          onMutateLogs={() => queryClient.invalidateQueries({ queryKey: queryKeys.logs.all })}
        />

        <DashboardPanel
          user={user}
          panelState={panelState}
          panelHandlers={{
            ...panelHandlers,
            handleCloseEditToView: panelHandlers.handleCloseEditToView,
            handleEditLogById: (logId: string) => {
              const log = logs.find((l) => l.id === logId)
              if (log) panelHandlers.handleEditLog(log)
            },
          }}
          tagNames={tagNames}
        />
      </div>
    </div>
  )
}
