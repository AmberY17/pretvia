"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TagFilter } from "@/components/dashboard/tag-filter";
import { DateFilter } from "@/components/dashboard/date-filter";
import { AthleteFilter } from "@/components/dashboard/athlete-filter";
import { RoleFilter } from "@/components/dashboard/role-filter";
import { ReviewStatusFilter } from "@/components/dashboard/review-status-filter";
import { AnnouncementBanner } from "@/components/dashboard/announcement-banner";
import { CheckinCard, type CheckinItem } from "@/components/dashboard/checkin-card";
import { LogCard, type LogEntry } from "@/components/dashboard/log-card";
import { DashboardFeedSkeleton } from "@/components/dashboard/dashboard-skeletons";
import type { User } from "@/hooks/use-auth";
import type { DashboardFiltersState, DashboardFiltersHandlers } from "@/hooks/use-dashboard-filters";

type Athlete = {
  id: string;
  displayName: string;
  email: string;
};

type Role = { id: string; name: string };

interface DashboardFeedProps {
  user: User;
  logs: LogEntry[];
  tags: { id: string; name: string }[];
  athletes: Athlete[];
  groupRoles: Role[];
  filters: DashboardFiltersState;
  handlers: DashboardFiltersHandlers;
  onViewLog: (log: LogEntry) => void;
  onEditLog: (log: LogEntry) => void;
  onDeleteLog: (id: string) => void;
  onCheckinLog: (sessionDate: string, checkinId: string) => void;
  onNewLog: () => void;
  onClosePanel: () => void;
  panelMode: "new" | "view" | "edit" | null;
  announcement: {
    id: string;
    text: string;
    coachName: string;
    createdAt: string;
  } | null;
  checkins: CheckinItem[];
  onMutateAnnouncement: () => void;
  onMutateCheckins: () => void;
  onMutateLogs?: () => void;
  isLoading?: boolean;
  hasMoreLogs?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
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
  onNewLog,
  onClosePanel,
  panelMode,
  announcement,
  checkins,
  onMutateAnnouncement,
  onMutateCheckins,
  onMutateLogs,
  isLoading = false,
  hasMoreLogs = false,
  isLoadingMore = false,
  onLoadMore,
}: DashboardFeedProps) {
  const scrollRef = useRef<HTMLMainElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMoreLogs || !onLoadMore || isLoadingMore) return;
    const scrollEl = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!scrollEl || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { root: scrollEl, rootMargin: "200px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreLogs, onLoadMore, isLoadingMore]);
  if (isLoading) {
    return <DashboardFeedSkeleton user={user} />;
  }

  const filteredAthlete = filters.filterAthleteId
    ? athletes.find((a) => a.id === filters.filterAthleteId)
    : null;
  const athleteSubline = filteredAthlete
    ? ` · ${filteredAthlete.displayName || filteredAthlete.email}`
    : "";

  const isFiltered =
    filters.activeTags.length > 0 ||
    filters.dateFilter !== "all" ||
    filters.filterSessionId ||
    filters.filterRoleId ||
    filters.filterReviewStatus ||
    filters.filterAthleteId;

  return (
    <main
      ref={scrollRef}
      className="flex-1 overflow-y-auto scrollbar-hidden p-6"
      onClick={() => {
        if (user.role === "coach" && panelMode === "view") onClosePanel();
      }}
      role={user.role === "coach" && panelMode === "view" ? "button" : undefined}
      tabIndex={user.role === "coach" && panelMode === "view" ? 0 : undefined}
    >
      <div className="mx-auto max-w-2xl">
        {user.role !== "coach" && (
          <div className="mb-4 flex flex-col gap-2 lg:hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Filter by
              </span>
              {(filters.activeTags.length > 0 || filters.dateFilter !== "all") && (
                <button
                  type="button"
                  onClick={handlers.clearAllFilters}
                  className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Reset all filters"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <TagFilter
              tags={tags}
              activeTags={filters.activeTags}
              onToggle={handlers.handleToggleTag}
              onClear={handlers.handleClearTags}
              hideHeader
            />
          </div>
        )}

        {user.role === "coach" && (
          <div className="flex flex-col gap-2 lg:hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Filter by
              </span>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handlers.clearAllFilters}
                  className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Reset all filters"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <RoleFilter
              variant="mobile"
              roles={groupRoles}
              filterRoleId={filters.filterRoleId}
              onFilter={(id) => handlers.setFilterRoleId(id)}
            />
            <AthleteFilter
              variant="mobile"
              athletes={athletes}
              filterAthleteId={filters.filterAthleteId}
              onFilter={handlers.handleFilterAthlete}
            />
            <ReviewStatusFilter
              variant="mobile"
              filterReviewStatus={filters.filterReviewStatus}
              onFilter={handlers.setFilterReviewStatus}
            />
          </div>
        )}

        <DateFilter
          variant="mobile"
          dateFilter={filters.dateFilter}
          customDate={filters.customDate}
          onDateFilterChange={handlers.setDateFilter}
          onCustomDateChange={handlers.setCustomDate}
          onClear={handlers.clearDateFilter}
        />

        {user.groupId && (
          <AnnouncementBanner
            announcement={announcement}
            isCoach={user.role === "coach"}
            onMutate={onMutateAnnouncement}
          />
        )}

        {user.groupId && (
          <CheckinCard
            checkins={checkins}
            isCoach={user.role === "coach"}
            onCheckinLog={onCheckinLog}
            onMutate={onMutateCheckins}
          />
        )}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Training Feed</h1>
            <p className="text-sm text-muted-foreground">
              {logs.length} {logs.length === 1 ? "entry" : "entries"}
              {isFiltered && " (filtered)"}
              {athleteSubline}
            </p>
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
          <AnimatePresence mode="popLayout">
            {logs.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16"
              >
                <span className="text-4xl">{"\u{1F3CB}\u{FE0F}"}</span>
                <p className="text-sm text-muted-foreground">
                  No logs yet. Create your first entry!
                </p>
              </motion.div>
            ) : (
              logs.map((log, i) => (
                <LogCard
                  key={log.id}
                  log={log}
                  onDelete={onDeleteLog}
                  onEdit={onEditLog}
                  onClick={onViewLog}
                  index={i}
                  currentUserId={user.id}
                  isCoach={user.role === "coach"}
                  groupId={user.groupId}
                  onMutateLogs={onMutateLogs}
                />
              ))
            )}
          </AnimatePresence>
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
  );
}
