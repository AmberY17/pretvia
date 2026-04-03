"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CoachOnboardingChecklist,
  isCoachOnboardingDone,
} from "@/components/main/dashboard/layout/onboarding/coach-onboarding-checklist"
import { LogCard } from "@/components/main/dashboard/logs"
import type { LogEntry } from "@/types/dashboard"
import { LogCardSkeleton } from "@/components/main/dashboard/layout/dashboard-skeletons"
import { MobileFilters } from "@/components/main/dashboard/layout/dashboard-feed/mobile-filters"
import { FeedAnnouncementSection } from "@/components/main/dashboard/layout/dashboard-feed/feed-announcement-section"
import { FeedCheckinSection } from "@/components/main/dashboard/layout/dashboard-feed/feed-checkin-section"
import type { User } from "@/hooks/use-auth"
import type {
  DashboardFiltersState,
  DashboardFiltersHandlers,
} from "@/components/main/dashboard/filters/hooks/use-dashboard-filters"
import type { Athlete, Role, Announcement, CheckinItem, TrainingSlot } from "@/types/dashboard"

interface DashboardFeedProps {
  user: User
  logs: LogEntry[]
  tags: { id: string; name: string }[]
  athletes: Athlete[]
  groupRoles: Role[]
  filters: DashboardFiltersState
  handlers: DashboardFiltersHandlers
  onViewLog: (log: LogEntry) => void
  onEditLog: (log: LogEntry) => void
  onDeleteLog: (id: string) => void
  onCheckinLog: (sessionDate: string, checkinId: string) => void
  onEditCheckinLog?: (logId: string) => void
  onNewLog: () => void
  onClosePanel: () => void
  panelMode: "new" | "view" | "edit" | null
  announcements: Announcement[]
  checkins: CheckinItem[]
  announcementLoading?: boolean
  checkinsLoading?: boolean
  trainingScheduleTemplate?: TrainingSlot[]
  onMutateAnnouncement: () => void
  onMutateCheckins: () => void
  onMutateLogs?: () => void
  isLoading?: boolean
  hasMoreLogs?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
}

export function DashboardFeed({
  user,
  logs,
  tags,
  athletes,
  groupRoles,
  filters,
  handlers,
  onViewLog,
  onEditLog,
  onDeleteLog,
  onCheckinLog,
  onEditCheckinLog,
  onNewLog,
  onClosePanel,
  panelMode,
  announcements,
  checkins,
  announcementLoading = false,
  checkinsLoading = false,
  trainingScheduleTemplate,
  onMutateAnnouncement,
  onMutateCheckins,
  onMutateLogs,
  isLoading = false,
  hasMoreLogs = false,
  isLoadingMore = false,
  onLoadMore,
}: DashboardFeedProps) {
  const scrollRef = useRef<HTMLElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingTriggeredRef = useRef(false)

  // For coaches: start with checklist visible, hide once onboarding confirmed done
  // Assistant coaches skip onboarding entirely — their group assignment is managed by the head coach
  const isAssistant = user.role === "coach" && !!user.subscription?.isAssistant
  const [coachOnboardingDone, setCoachOnboardingDone] = useState(
    user.role !== "coach" || isAssistant,
  )

  useEffect(() => {
    if (user.role !== "coach" || isAssistant) return
    setCoachOnboardingDone(isCoachOnboardingDone())
  }, [user.role, isAssistant])

  useEffect(() => {
    if (!isLoadingMore) loadingTriggeredRef.current = false
  }, [isLoadingMore])

  useEffect(() => {
    if (!hasMoreLogs || !onLoadMore || isLoadingMore) return
    const scrollEl = scrollRef.current
    const sentinel = sentinelRef.current
    if (!scrollEl || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingTriggeredRef.current) return
        loadingTriggeredRef.current = true
        onLoadMore()
      },
      { root: scrollEl, rootMargin: "200px", threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMoreLogs, onLoadMore, isLoadingMore])

  const isFiltered =
    filters.activeTags.length > 0 ||
    filters.dateFilter !== "all" ||
    filters.filterSessionIds.length > 0 ||
    filters.filterRoleIds.length > 0 ||
    filters.filterReviewStatuses.length > 0 ||
    filters.filterAthleteIds.length > 0 ||
    filters.filterVisibility

  return (
    <main
      ref={scrollRef}
      className="flex-1 overflow-y-auto scrollbar-hidden p-6"
      onClick={() => {
        if (panelMode === "view") onClosePanel()
      }}
      role={user.role === "coach" && panelMode === "view" ? "button" : undefined}
      tabIndex={user.role === "coach" && panelMode === "view" ? 0 : undefined}
    >
      <div className="mx-auto max-w-2xl">
        <MobileFilters
          user={user}
          tags={tags}
          groupRoles={groupRoles}
          athletes={athletes}
          filters={filters}
          handlers={handlers}
          isFiltered={!!isFiltered}
        />

        <FeedAnnouncementSection
          show={!!user.activeGroupId}
          loading={announcementLoading}
          announcements={announcements}
          isCoach={user.role === "coach"}
          currentUserId={user.id}
          onMutate={onMutateAnnouncement}
        />

        <FeedCheckinSection
          show={!!user.activeGroupId}
          loading={checkinsLoading}
          checkins={checkins}
          isCoach={user.role === "coach"}
          onCheckinLog={onCheckinLog}
          onEditCheckinLog={onEditCheckinLog}
          onMutate={onMutateCheckins}
          trainingScheduleTemplate={trainingScheduleTemplate}
        />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {!coachOnboardingDone ? "Onboarding" : "Training Feed"}
            </h1>
          </div>
          {user.role !== "coach" && (
            <Button
              variant="ghost-primary"
              size="sm"
              className="gap-2 lg:hidden"
              onClick={onNewLog}
            >
              <Plus className="h-4 w-4" />
              Log
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {!coachOnboardingDone ? (
            <CoachOnboardingChecklist
              hasGroup={!!user.activeGroupId}
              onComplete={() => setCoachOnboardingDone(true)}
            />
          ) : (
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-3"
              >
                {[1, 2, 3, 4].map((i) => (
                  <LogCardSkeleton key={i} />
                ))}
              </motion.div>
            ) : logs.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16"
              >
                <span className="text-4xl">{"\u{1F3CB}\u{FE0F}"}</span>
                <p className="text-sm text-muted-foreground">
                  {isFiltered ? "No logs match your filters." : "No logs yet."}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="logs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, pointerEvents: "none" }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-3"
              >
                {logs.map((log, i) => (
                  <LogCard
                    key={log.id}
                    log={log}
                    onDelete={onDeleteLog}
                    onEdit={onEditLog}
                    onClick={onViewLog}
                    index={i}
                    currentUserId={user.id}
                    isCoach={user.role === "coach"}
                    groupId={user.activeGroupId}
                    onMutateLogs={onMutateLogs}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          )}
          {hasMoreLogs && (
            <div
              ref={sentinelRef}
              className="flex min-h-[80px] items-center justify-center py-4"
              aria-hidden
            >
              {isLoadingMore && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
