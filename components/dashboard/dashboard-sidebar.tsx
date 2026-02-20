"use client";

import { SidebarProfile } from "@/components/dashboard/sidebar-profile";
import { TagFilter } from "@/components/dashboard/tag-filter";
import { SessionFilter } from "@/components/dashboard/session-filter";
import { DateFilter } from "@/components/dashboard/date-filter";
import { AthleteFilter } from "@/components/dashboard/athlete-filter";
import { RoleFilter } from "@/components/dashboard/role-filter";
import type { User } from "@/hooks/use-auth";
import type { DashboardFiltersState, DashboardFiltersHandlers } from "@/hooks/use-dashboard-filters";

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
}: DashboardSidebarProps) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto scrollbar-hidden border-r border-border p-4 lg:flex">
      <SidebarProfile
        user={user}
        onLogout={onLogout}
        onGroupChanged={onGroupChanged}
      />
      {user.role === "coach" ? (
        <SessionFilter
          sessions={sessions}
          activeSessionId={filters.filterSessionId}
          onSelect={(id) =>
            handlers.setFilterSessionId((prev) => (prev === id ? null : id))
          }
          onClear={() => handlers.setFilterSessionId(null)}
        />
      ) : (
        <TagFilter
          tags={tags}
          activeTags={filters.activeTags}
          onToggle={handlers.handleToggleTag}
          onClear={handlers.handleClearTags}
        />
      )}
      <DateFilter
        variant="sidebar"
        dateFilter={filters.dateFilter}
        customDate={filters.customDate}
        onDateFilterChange={handlers.setDateFilter}
        onCustomDateChange={handlers.setCustomDate}
        onClear={handlers.clearDateFilter}
      />
      {user.role === "coach" && (
        <>
          <AthleteFilter
            variant="sidebar"
            athletes={athletes}
            filterAthleteId={filters.filterAthleteId}
            onFilter={handlers.handleFilterAthlete}
          />
          <RoleFilter
            variant="sidebar"
            roles={groupRoles}
            filterRoleId={filters.filterRoleId}
            onFilter={handlers.setFilterRoleId}
          />
        </>
      )}
    </aside>
  );
}
