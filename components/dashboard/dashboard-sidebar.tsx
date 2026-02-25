"use client";

import { useState, useEffect, useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { SidebarProfile } from "@/components/dashboard/sidebar-profile";
import { CollapsibleFilterSection } from "@/components/dashboard/collapsible-filter-section";
import { TagFilter } from "@/components/dashboard/tag-filter";
import { SessionFilter } from "@/components/dashboard/session-filter";
import { DateFilter } from "@/components/dashboard/date-filter";
import { AthleteFilter } from "@/components/dashboard/athlete-filter";
import { RoleFilter } from "@/components/dashboard/role-filter";
import { ReviewStatusFilter } from "@/components/dashboard/review-status-filter";
import { SidebarFilterSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { SidebarStatsCard } from "@/components/dashboard/sidebar-stats-card";
import type { User } from "@/hooks/use-auth";
import type {
  DashboardFiltersState,
  DashboardFiltersHandlers,
} from "@/hooks/use-dashboard-filters";

const COACH_FILTER_ORDER_KEY = "prets-coach-filter-order";
const DEFAULT_COACH_ORDER = [
  "sessions",
  "role",
  "reviewStatus",
  "athlete",
  "date",
] as const;

type CoachFilterId = (typeof DEFAULT_COACH_ORDER)[number];

type SessionItem = {
  id: string;
  title: string | null;
  sessionDate: string;
  checkedInCount: number;
  totalAthletes: number;
};

type Athlete = {
  id: string;
  displayName: string;
  email: string;
};

type Role = { id: string; name: string };

interface DashboardSidebarProps {
  user: User;
  onLogout: () => void;
  onGroupChanged: () => void;
  filters: DashboardFiltersState;
  handlers: DashboardFiltersHandlers;
  tags: { id: string; name: string }[];
  sessions: SessionItem[];
  athletes: Athlete[];
  groupRoles: Role[];
  isLoading?: boolean;
  stats?: {
    totalLogs: number;
    streak: number;
    hasTrainingSlots: boolean;
    canSkipToday: boolean;
    skipDisabledReason: "no_training" | "already_skipped" | "already_logged" | null;
  };
  onMutateStats?: () => void;
}

export function DashboardSidebar({
  user,
  onLogout,
  onGroupChanged,
  filters,
  handlers,
  tags,
  sessions,
  athletes,
  groupRoles,
  isLoading = false,
  stats,
  onMutateStats = () => {},
}: DashboardSidebarProps) {
  const [coachFilterOrder, setCoachFilterOrder] = useState<CoachFilterId[]>(
    () => [...DEFAULT_COACH_ORDER],
  );
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const handleResetAll = () => {
    handlers.clearAllFilters();
    setOpenSections({});
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(COACH_FILTER_ORDER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        const valid = DEFAULT_COACH_ORDER.filter((id) => parsed.includes(id));
        if (valid.length === DEFAULT_COACH_ORDER.length) {
          setCoachFilterOrder(parsed as CoachFilterId[]);
        }
      }
    } catch {
      // ignore invalid localStorage
    }
  }, []);

  const hasAnyFilter =
    filters.activeTags.length > 0 ||
    filters.dateFilter !== "all" ||
    !!filters.filterSessionId ||
    !!filters.filterAthleteId ||
    !!filters.filterRoleId ||
    !!filters.filterReviewStatus;

  const coachSections = useMemo(() => {
    const order = coachFilterOrder;
    const sections: {
      id: CoachFilterId;
      title: string;
      node: React.ReactNode;
    }[] = [];

    const byId: Record<CoachFilterId, React.ReactNode> = {
      sessions: (
        <SessionFilter
          sessions={sessions}
          activeSessionId={filters.filterSessionId}
          onSelect={(id) =>
            handlers.setFilterSessionId((prev) => (prev === id ? null : id))
          }
          onClear={() => handlers.setFilterSessionId(null)}
          hideHeader
        />
      ),
      role: (
        <RoleFilter
          variant="sidebar"
          roles={groupRoles}
          filterRoleId={filters.filterRoleId}
          onFilter={handlers.setFilterRoleId}
          hideHeader
        />
      ),
      reviewStatus: (
        <ReviewStatusFilter
          variant="sidebar"
          filterReviewStatus={filters.filterReviewStatus}
          onFilter={handlers.setFilterReviewStatus}
          hideHeader
        />
      ),
      athlete: (
        <AthleteFilter
          variant="sidebar"
          athletes={athletes}
          filterAthleteId={filters.filterAthleteId}
          onFilter={handlers.handleFilterAthlete}
          hideHeader
        />
      ),
      date: (
        <DateFilter
          variant="sidebar"
          dateFilter={filters.dateFilter}
          customDate={filters.customDate}
          onDateFilterChange={handlers.setDateFilter}
          onCustomDateChange={handlers.setCustomDate}
          onClear={handlers.clearDateFilter}
          hideHeader
        />
      ),
    };

    const titles: Record<CoachFilterId, string> = {
      sessions: "Training Sessions",
      role: "Role",
      reviewStatus: "Review Status",
      athlete: "Athlete",
      date: "Date",
    };

    for (const id of order) {
      sections.push({
        id,
        title: titles[id],
        node: byId[id],
      });
    }

    return sections;
  }, [
    coachFilterOrder,
    sessions,
    filters,
    handlers,
    groupRoles,
    athletes,
  ]);

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto scrollbar-hidden border-r border-border p-4 lg:flex">
      <SidebarProfile
        user={user}
        onLogout={onLogout}
        onGroupChanged={onGroupChanged}
      />

      {user.role === "athlete" && stats && (
        <SidebarStatsCard
          totalLogs={stats.totalLogs}
          streak={stats.streak}
          hasTrainingSlots={stats.hasTrainingSlots}
          canSkipToday={stats.canSkipToday}
          skipDisabledReason={stats.skipDisabledReason}
          onMutateStats={onMutateStats}
        />
      )}

      {isLoading ? (
        <SidebarFilterSkeleton />
      ) : (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            FILTER BY
          </h3>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={handleResetAll}
              className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {user.role === "coach" ? (
            coachSections.map((s) => (
              <CollapsibleFilterSection
                key={s.id}
                title={s.title}
                open={openSections[s.id] ?? false}
                onOpenChange={(open) =>
                  setOpenSections((prev) => ({ ...prev, [s.id]: open }))
                }
              >
                {s.node}
              </CollapsibleFilterSection>
            ))
          ) : (
            <>
              <CollapsibleFilterSection
                title="Tags"
                open={openSections.tags ?? false}
                onOpenChange={(open) =>
                  setOpenSections((prev) => ({ ...prev, tags: open }))
                }
              >
                <TagFilter
                  tags={tags}
                  activeTags={filters.activeTags}
                  onToggle={handlers.handleToggleTag}
                  onClear={handlers.handleClearTags}
                  hideHeader
                />
              </CollapsibleFilterSection>
              <CollapsibleFilterSection
                title="Date"
                open={openSections.date ?? false}
                onOpenChange={(open) =>
                  setOpenSections((prev) => ({ ...prev, date: open }))
                }
              >
                <DateFilter
                  variant="sidebar"
                  dateFilter={filters.dateFilter}
                  customDate={filters.customDate}
                  onDateFilterChange={handlers.setDateFilter}
                  onCustomDateChange={handlers.setCustomDate}
                  onClear={handlers.clearDateFilter}
                  hideHeader
                />
              </CollapsibleFilterSection>
            </>
          )}
        </div>
      </div>
      )}
    </aside>
  );
}
