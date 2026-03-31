"use client"

import { RotateCcw } from "lucide-react"
import { TagFilter } from "@/components/main/dashboard/filters/tag-filter"
import { DateFilter } from "@/components/main/dashboard/filters/date-filter"
import { AthleteFilter } from "@/components/main/dashboard/filters/athlete-filter"
import { RoleFilter } from "@/components/main/dashboard/filters/role-filter"
import { ReviewStatusFilter } from "@/components/main/dashboard/filters/review-status-filter"
import type { User } from "@/hooks/use-auth"
import type {
  DashboardFiltersState,
  DashboardFiltersHandlers,
} from "@/components/main/dashboard/filters/hooks/use-dashboard-filters"
import type { Athlete, Role } from "@/types/dashboard"

interface MobileFiltersProps {
  user: User
  tags: { id: string; name: string }[]
  groupRoles: Role[]
  athletes: Athlete[]
  filters: DashboardFiltersState
  handlers: DashboardFiltersHandlers
  isFiltered: boolean
}

export function MobileFilters({
  user,
  tags,
  groupRoles,
  athletes,
  filters,
  handlers,
  isFiltered,
}: MobileFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-2 lg:hidden">
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

      {user.role !== "coach" && (
        <TagFilter
          tags={tags}
          activeTags={filters.activeTags}
          onToggle={handlers.handleToggleTag}
          onClear={handlers.handleClearTags}
          hideHeader
          variant="mobile"
        />
      )}

      {user.role === "coach" && (
        <>
          <RoleFilter
            variant="mobile"
            roles={groupRoles}
            filterRoleIds={filters.filterRoleIds}
            onToggle={handlers.toggleFilterRoleId}
            onClear={handlers.clearFilterRoleIds}
          />
          <AthleteFilter
            variant="mobile"
            athletes={athletes}
            filterAthleteIds={filters.filterAthleteIds}
            onToggle={handlers.toggleFilterAthleteId}
            onClear={handlers.clearFilterAthleteIds}
          />
          <ReviewStatusFilter
            variant="mobile"
            filterReviewStatuses={filters.filterReviewStatuses}
            onToggle={handlers.toggleFilterReviewStatus}
            onClear={handlers.clearFilterReviewStatuses}
          />
        </>
      )}

      <DateFilter
        variant="mobile"
        inline
        dateFilter={filters.dateFilter}
        customDates={filters.customDates}
        onDateFilterChange={handlers.setDateFilter}
        onCustomDatesChange={handlers.setCustomDates}
        onClear={handlers.clearDateFilter}
      />
    </div>
  )
}
