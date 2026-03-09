"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { LogEntry } from "@/components/dashboard/logs/log-card";

export type PanelMode = "new" | "view" | "edit" | null;

export interface CheckinPrefill {
  timestamp: string;
  checkinId: string;
}

type LogsPage = { logs: LogEntry[]; nextCursor: string | null };
type MutateLogs = (
  updater?: (pages: LogsPage[] | undefined) => LogsPage[] | undefined,
  opts?: { revalidate?: boolean }
) => void;

export interface UseDashboardPanelParams {
  userId?: string;
  mutateLogs: MutateLogs;
  mutateTags: () => void;
  mutateCheckins?: () => void;
  mutateAllCheckins?: () => void;
  mutateStats?: () => void;
}

export function useDashboardPanel({
  userId,
  mutateLogs,
  mutateTags,
  mutateCheckins = () => {},
  mutateAllCheckins = () => {},
  mutateStats = () => {},
}: UseDashboardPanelParams) {
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [checkinPrefill, setCheckinPrefill] = useState<CheckinPrefill | null>(
    null,
  );
  const [celebrationCount, setCelebrationCount] = useState<number | null>(null);

  useEffect(() => {
    setPanelMode(null);
    setSelectedLog(null);
    setCheckinPrefill(null);
    setCelebrationCount(null);
  }, [userId]);

  const handleLogCreated = useCallback(
    (totalCount?: number) => {
      mutateLogs();
      mutateTags();
      mutateCheckins();
      mutateAllCheckins();
      setCheckinPrefill(null);
      setPanelMode("new");
      setSelectedLog(null);
      if (typeof totalCount === "number") {
        setCelebrationCount(totalCount);
      }
      mutateStats();
    },
    [mutateLogs, mutateTags, mutateCheckins, mutateAllCheckins, mutateStats],
  );

  const handleLogUpdated = useCallback(() => {
    mutateLogs();
    mutateTags();
    setPanelMode(null);
    setSelectedLog(null);
  }, [mutateLogs, mutateTags]);

  const handleCelebrationDismiss = useCallback(() => {
    setCelebrationCount(null);
  }, []);

  const handleDeleteLog = useCallback(
    async (id: string) => {
      // Optimistically remove from the local cache immediately so the UI
      // doesn't re-fetch and flash a loading state.
      mutateLogs(
        (pages) =>
          pages?.map((page) => ({
            ...page,
            logs: page.logs.filter((l) => l.id !== id),
          })),
        { revalidate: false }
      );

      if (selectedLog?.id === id) {
        setPanelMode("new");
        setSelectedLog(null);
      }

      try {
        const res = await fetch(`/api/logs?id=${id}`, { method: "DELETE" });
        if (!res.ok) {
          toast.error("Failed to delete log");
          // Roll back by revalidating
          mutateLogs(undefined, { revalidate: true });
          return;
        }
        // Revalidate tags and stats in the background
        mutateTags();
        mutateStats();
      } catch {
        toast.error("Network error");
        mutateLogs(undefined, { revalidate: true });
      }
    },
    [mutateLogs, mutateTags, mutateStats, selectedLog],
  );

  const handleViewLog = useCallback((log: LogEntry) => {
    setSelectedLog(log);
    setPanelMode("view");
  }, []);

  const handleEditLog = useCallback((log: LogEntry) => {
    setSelectedLog(log);
    setPanelMode("edit");
  }, []);

  const handleNewLog = useCallback(() => {
    setSelectedLog(null);
    setCheckinPrefill(null);
    setPanelMode("new");
  }, []);

  const handleCheckinLog = useCallback(
    (sessionDate: string, checkinId: string) => {
      setSelectedLog(null);
      setCheckinPrefill({ timestamp: sessionDate, checkinId });
      setPanelMode("new");
    },
    [],
  );

  const handleClosePanel = useCallback(() => {
    setPanelMode(null);
    setSelectedLog(null);
    setCheckinPrefill(null);
  }, []);

  const handleCloseEditToView = useCallback(() => {
    setPanelMode("view");
  }, []);

  return {
    panelState: {
      panelMode,
      selectedLog,
      checkinPrefill,
      celebrationCount,
      isPanelOpen: panelMode !== null,
    },
    panelHandlers: {
      handleViewLog,
      handleEditLog,
      handleNewLog,
      handleClosePanel,
      handleCloseEditToView,
      handleCheckinLog,
      handleLogCreated,
      handleLogUpdated,
      handleCelebrationDismiss,
      handleDeleteLog,
      handleMutateLogs: mutateLogs,
    },
  };
}
