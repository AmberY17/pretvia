"use client";

import { useState, useCallback } from "react";
import type { DateFilterKey } from "@/lib/date-utils";
import {
  useLogsUrl,
  type LogsUrlFilters,
} from "@/hooks/use-logs-url";

export interface DashboardFiltersState {
  activeTags: string[];
  dateFilter: DateFilterKey;
  customDate: string;
  filterAthleteId: string | null;
  filterSessionId: string | null;
  filterRoleId: string | null;
}

export interface DashboardFiltersHandlers {
  handleToggleTag: (tag: string) => void;
  handleClearTags: () => void;
  setDateFilter: (value: DateFilterKey) => void;
  setCustomDate: (value: string) => void;
  handleFilterAthlete: (athleteId: string | null) => void;
  setFilterSessionId: (id: string | null | ((prev: string | null) => string | null)) => void;
  setFilterRoleId: (id: string | null | ((prev: string | null) => string | null)) => void;
  clearDateFilter: () => void;
  clearAllOnGroupChange: () => void;
}

export function useDashboardFilters() {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");
  const [customDate, setCustomDate] = useState<string>("");
  const [filterAthleteId, setFilterAthleteId] = useState<string | null>(null);
  const [filterSessionId, setFilterSessionId] = useState<string | null>(null);
  const [filterRoleId, setFilterRoleId] = useState<string | null>(null);

  const filters: LogsUrlFilters = {
    activeTags,
    filterAthleteId,
    filterSessionId,
    filterRoleId,
    dateFilter,
    customDate,
  };

  const logsUrl = useLogsUrl(filters);

  const handleToggleTag = useCallback((tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleClearTags = useCallback(() => {
    setActiveTags([]);
  }, []);

  const handleFilterAthlete = useCallback((athleteId: string | null) => {
    setFilterAthleteId(athleteId);
  }, []);

  const clearDateFilter = useCallback(() => {
    setDateFilter("all");
    setCustomDate("");
  }, []);

  const clearAllOnGroupChange = useCallback(() => {
    setFilterAthleteId(null);
    setFilterSessionId(null);
  }, []);

  const filtersState: DashboardFiltersState = {
    activeTags,
    dateFilter,
    customDate,
    filterAthleteId,
    filterSessionId,
    filterRoleId,
  };

  const handlers: DashboardFiltersHandlers = {
    handleToggleTag,
    handleClearTags,
    setDateFilter,
    setCustomDate,
    handleFilterAthlete,
    setFilterSessionId,
    setFilterRoleId,
    clearDateFilter,
    clearAllOnGroupChange,
  };

  return {
    filters: filtersState,
    handlers,
    logsUrl,
  };
}
