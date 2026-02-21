"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import useSWR from "swr";
import { useAuth } from "@/hooks/use-auth";
import { urlFetcher } from "@/lib/swr-utils";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { useDashboardPanel } from "@/hooks/use-dashboard-panel";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardFeed } from "@/components/dashboard/dashboard-feed";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { LogCard, type LogEntry } from "@/components/dashboard/log-card";
import { CheckinCard, type CheckinItem } from "@/components/dashboard/checkin-card";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, mutate: mutateAuth } = useAuth();
  const { filters, handlers, logsUrl } = useDashboardFilters();

  const { data: logsData, mutate: mutateLogs } = useSWR<{ logs: LogEntry[] }>(
    user ? [logsUrl, user.id, user.groupId ?? ""] : null,
    urlFetcher,
  );

  const { data: tagsData, mutate: mutateTags } = useSWR<{
    tags: { id: string; name: string }[];
  }>(user ? ["/api/tags", user.id] : null, urlFetcher);

  const { data: membersData } = useSWR<{
    members: { id: string; displayName: string; email: string; role: string }[];
    roles: { id: string; name: string }[];
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

  const { data: announcementData, mutate: mutateAnnouncement } = useSWR<{
    announcement: {
      id: string;
      text: string;
      coachName: string;
      createdAt: string;
    } | null;
  }>(
    user?.groupId ? ["/api/announcements", user.id, user.groupId] : null,
    urlFetcher,
  );

  const { panelState, panelHandlers } = useDashboardPanel({
    mutateLogs,
    mutateTags,
    mutateCheckins,
    mutateAllCheckins,
  });

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const logs = logsData?.logs ?? [];
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
      <DashboardHeader user={user} onNewLog={panelHandlers.handleNewLog} />

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          user={user}
          onLogout={() => mutateAuth()}
          onGroupChanged={handleGroupChanged}
          filters={filters}
          handlers={handlers}
          tags={tags}
          sessions={sessions}
          athletes={athletes}
          groupRoles={groupRoles}
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
          announcement={announcementData?.announcement ?? null}
          checkins={checkinsData?.checkins ?? []}
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
