"use client";

import { useEffect, useCallback, useRef } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import useSWRInfinite from "swr/infinite";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { urlFetcher, logsInfiniteFetcher } from "@/lib/swr-utils";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { useDashboardPanel } from "@/hooks/use-dashboard-panel";
import { DashboardHeader } from "@/components/dashboard/main/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/main/dashboard-sidebar";
import { DashboardFeed } from "@/components/dashboard/main/dashboard-feed";
import { DashboardPanel } from "@/components/dashboard/main/dashboard-panel";
import { LoadingScreen } from "@/components/ui/loading-screen";
import type { LogEntry } from "@/types/dashboard";
import type { CheckinItem } from "@/components/dashboard/shared/checkin-card";

export default function DashboardPage() {
  const { user, isLoading: authLoading, mutate: mutateAuth, loggingOutRef } = useRequireAuth();
  const { filters, handlers, logsUrl } = useDashboardFilters();

  const {
    data: logsPagesData,
    isLoading: logsLoading,
    mutate: mutateLogs,
    size,
    setSize,
    isValidating: logsValidating,
  } = useSWRInfinite<{ logs: LogEntry[]; nextCursor: string | null }>(
    (pageIndex, previousPageData) => {
      if (!user) return null;
      if (pageIndex === 0) return [logsUrl, user.id, null] as const;
      if (!previousPageData?.nextCursor) return null;
      return [logsUrl, user.id, previousPageData.nextCursor] as const;
    },
    logsInfiniteFetcher,
    {
      revalidateFirstPage: false, // Keep first page when loading more
    },
  );

  const logs = (logsPagesData ?? []).flatMap((p) => p.logs) as LogEntry[];
  const hasMoreLogs = (logsPagesData?.[logsPagesData.length - 1]?.nextCursor ?? null) !== null;
  const prevLogsUrlRef = useRef(logsUrl);
  const prevUserIdRef = useRef(user?.id);
  useEffect(() => {
    if (prevLogsUrlRef.current !== logsUrl || prevUserIdRef.current !== user?.id) {
      prevLogsUrlRef.current = logsUrl;
      prevUserIdRef.current = user?.id;
      setSize(1);
    }
  }, [logsUrl, user?.id, setSize]);

  const { data: tagsData, isLoading: tagsLoading, mutate: mutateTags } = useSWR<{
    tags: { id: string; name: string }[];
  }>(user ? ["/api/tags", user.id] : null, urlFetcher);

  const { data: membersData } = useSWR<{
    members: { id: string; displayName: string; email: string; role: string }[];
    roles: { id: string; name: string }[];
    trainingScheduleTemplate?: { dayOfWeek: number; time: string }[];
  }>(
    user?.role === "coach" && user?.groupId
      ? [`/api/groups?groupId=${user.groupId}`, user.id]
      : null,
    urlFetcher,
  );

  const { data: checkinsData, mutate: mutateCheckins } = useSWR<{
    checkins: CheckinItem[];
  }>(user?.groupId ? ["/api/checkins", user.id, user.groupId] : null, urlFetcher);

  const { data: allCheckinsData, mutate: mutateAllCheckins } = useSWR<{
    checkins: CheckinItem[];
  }>(
    user?.role === "coach" && user?.groupId
      ? ["/api/checkins?mode=all", user.id, user.groupId]
      : null,
    urlFetcher,
  );

  const { data: statsData, mutate: mutateStats } = useSWR<{
    totalLogs: number;
    streak: number;
    hasTrainingSlots: boolean;
    canSkipToday: boolean;
    skipDisabledReason: "no_training" | "already_skipped" | "already_logged" | null;
  }>(
    user?.role === "athlete" ? ["/api/stats", user.id] : null,
    urlFetcher,
  );

  const { data: announcementData, mutate: mutateAnnouncement } = useSWR<{
    announcements: {
      id: string;
      text: string;
      coachName: string;
      createdAt: string;
    }[];
  }>(
    user?.groupId ? ["/api/announcements", user.id, user.groupId] : null,
    urlFetcher,
  );

  const handleLogout = useCallback(() => {
    loggingOutRef.current = true;
    globalMutate(() => true, undefined, { revalidate: false });
    mutateAuth();
  }, [mutateAuth]);

  const { panelState, panelHandlers } = useDashboardPanel({
    userId: user?.id,
    mutateLogs,
    mutateTags,
    mutateCheckins,
    mutateAllCheckins,
    mutateStats: user?.role === "athlete" ? mutateStats : undefined,
  });

  const prevUserIdForFiltersRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevUserIdForFiltersRef.current !== undefined && prevUserIdForFiltersRef.current !== user?.id) {
      handlers.clearAllFilters();
    }
    prevUserIdForFiltersRef.current = user?.id;
  }, [user?.id, handlers]);

  const handleGroupChanged = useCallback(() => {
    mutateAuth();
    mutateLogs();
    mutateAnnouncement();
    mutateCheckins();
    mutateAllCheckins();
    handlers.clearAllOnGroupChange();
  }, [
    mutateAuth,
    mutateLogs,
    mutateAnnouncement,
    mutateCheckins,
    mutateAllCheckins,
    handlers,
  ]);

  const { data: myGroupsData } = useSWR<{
    groups: {
      id: string;
      name: string;
      code: string;
      coachId: string;
      trainingScheduleUpdatedAt?: string | null;
    }[];
  }>(
    user ? ["/api/groups?mode=my-groups", user.id] : null,
    urlFetcher,
  );

  useEffect(() => {
    if (!user || user.role !== "athlete") return;
    if (!myGroupsData?.groups?.length) return;
    if (typeof window === "undefined") return;

    try {
      const key = "pretvia-group-schedule-seen";
      const stored = window.localStorage.getItem(key);
      const seen: Record<string, string> = stored ? JSON.parse(stored) : {};
      const updatedSeen: Record<string, string> = { ...seen };

      myGroupsData.groups.forEach((g) => {
        if (!g.trainingScheduleUpdatedAt) return;
        const updatedAt = new Date(g.trainingScheduleUpdatedAt).getTime();
        if (Number.isNaN(updatedAt)) return;
        const lastSeen = seen[g.id] ? new Date(seen[g.id]).getTime() : 0;
        if (!lastSeen || updatedAt > lastSeen) {
          toast.info(`Your coach updated the training schedule for ${g.name}.`);
          updatedSeen[g.id] = g.trainingScheduleUpdatedAt;
        }
      });

      window.localStorage.setItem(key, JSON.stringify(updatedSeen));
    } catch {
      // ignore storage errors
    }
  }, [user, myGroupsData]);

  if (authLoading || !user) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  const tags = tagsData?.tags ?? [];
  const tagNames = tags.map((t) => t.name);
  const athletes = (membersData?.members ?? []).filter(
    (m) => m.role !== "coach",
  );
  const groupRoles = membersData?.roles ?? [];
  const sessions = (allCheckinsData?.checkins ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    sessionDate: c.sessionDate,
    checkedInCount: c.checkedInCount,
    totalAthletes: c.totalAthletes,
  }));

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader
          user={user}
          onNewLog={panelHandlers.handleNewLog}
          onLogout={handleLogout}
        />

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
          onMutateStats={mutateStats}
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
          trainingScheduleTemplate={membersData?.trainingScheduleTemplate}
          isLoading={logsLoading}
          hasMoreLogs={hasMoreLogs}
          isLoadingMore={logsValidating}
          onLoadMore={() => setSize(size + 1)}
          onMutateAnnouncement={() => mutateAnnouncement()}
          onMutateCheckins={() => {
            mutateCheckins();
            mutateAllCheckins();
          }}
          onMutateLogs={() => mutateLogs()}
        />

        <DashboardPanel
            user={user}
            panelState={panelState}
            panelHandlers={{
              ...panelHandlers,
              handleCloseEditToView: panelHandlers.handleCloseEditToView,
            }}
            tagNames={tagNames}
          />
      </div>
    </div>
  );
}
