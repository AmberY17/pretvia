"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { LogEntry } from "@/components/dashboard/log-card";

export type PanelMode = "new" | "view" | "edit" | null;

export interface CheckinPrefill {
  timestamp: string;
  checkinId: string;
}

export interface UseDashboardPanelParams {
  mutateLogs: () => void;
  mutateTags: () => void;
  mutateCheckins?: () => void;
  mutateAllCheckins?: () => void;
  mutateStats?: () => void;
}

export function useDashboardPanel({
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

  const handleCelebrationDismiss = useCallback(() => {
    setCelebrationCount(null);
  }, []);

  const handleDeleteLog = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/logs?id=${id}`, { method: "DELETE" });
        if (!res.ok) {
          toast.error("Failed to delete log");
          return;
        }
        mutateLogs();
        mutateTags();
        if (selectedLog?.id === id) {
          setPanelMode("new");
          setSelectedLog(null);
        }
      } catch {
        toast.error("Network error");
      }
    },
    [mutateLogs, mutateTags, selectedLog],
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
      handleCelebrationDismiss,
      handleDeleteLog,
      handleMutateLogs: mutateLogs,
    },
  };
}
