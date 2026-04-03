"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { LogEntry } from "@/types/dashboard";

export type PanelMode = "new" | "view" | "edit" | null;

export interface CheckinPrefill {
  timestamp: string;
  checkinId: string;
}

export interface UseDashboardPanelParams {
  userId?: string;
  queryClient: QueryClient;
  logsQueryKey: readonly unknown[];
}

type LogsPage = { logs: LogEntry[]; nextCursor: string | null };
type InfiniteData = { pages: LogsPage[]; pageParams: unknown[] };

export function useDashboardPanel({
  userId,
  queryClient,
  logsQueryKey,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkins.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      setCheckinPrefill(null);
      setPanelMode(null);
      setSelectedLog(null);
      if (typeof totalCount === "number") {
        setCelebrationCount(totalCount);
      }
    },
    [queryClient],
  );

  // BUG FIX #3: handleLogUpdated now also invalidates checkins and stats
  const handleLogUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.checkins.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    setPanelMode(null);
    setSelectedLog(null);
  }, [queryClient]);

  const handleCelebrationDismiss = useCallback(() => {
    setCelebrationCount(null);
  }, []);

  // BUG FIX #4: handleDeleteLog now also invalidates allCheckins (via checkins.all prefix)
  const handleDeleteLog = useCallback(
    async (id: string) => {
      // Optimistically remove from the local cache
      queryClient.setQueryData<InfiniteData>(logsQueryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            logs: page.logs.filter((l) => l.id !== id),
          })),
        };
      });

      if (selectedLog?.id === id) {
        setPanelMode("new");
        setSelectedLog(null);
      }

      try {
        const res = await fetch(`/api/logs?id=${id}`, { method: "DELETE" });
        if (!res.ok) {
          toast.error("Failed to delete log");
          queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
          return;
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.checkins.all });
      } catch {
        toast.error("Network error");
        queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
      }
    },
    [queryClient, logsQueryKey, selectedLog],
  );

  const mutateLogs = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
  }, [queryClient]);

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
