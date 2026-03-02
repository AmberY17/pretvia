"use client";

import { useState, useCallback } from "react";
import type {
  DateFilterKey,
  CustomDateSelection,
} from "@/lib/date-utils";
import {
  useLogsUrl,
  type LogsUrlFilters,
} from "@/hooks/use-logs-url";

export type ReviewStatusFilterValue =
  | "pending"
  | "reviewed"
  | "revisit"
  | null;

export interface DashboardFiltersState {
  activeTags: string[];
  dateFilter: DateFilterKey;
  customDates: CustomDateSelection | null;
  filterAthleteId: string | null;
  filterSessionId: string | null;
  filterRoleId: string | null;
  filterReviewStatus: ReviewStatusFilterValue;
}

export interface DashboardFiltersHandlers {
  handleToggleTag: (tag: string) => void;
  handleClearTags: () => void;
  setDateFilter: (value: DateFilterKey) => void;
  setCustomDates: (value: CustomDateSelection | null) => void;
  handleFilterAthlete: (athleteId: string | null) => void;
  setFilterSessionId: (id: string | null | ((prev: string | null) => string | null)) => void;
  setFilterRoleId: (id: string | null | ((prev: string | null) => string | null)) => void;
  setFilterReviewStatus: (value: ReviewStatusFilterValue) => void;
  clearDateFilter: () => void;
  clearAllOnGroupChange: () => void;
  clearAllFilters: () => void;
}

export function useDashboardFilters() {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");
  const [customDates, setCustomDates] = useState<CustomDateSelection | null>(
    null,
  );
  const [filterAthleteId, setFilterAthleteId] = useState<string | null>(null);
  const [filterSessionId, setFilterSessionId] = useState<string | null>(null);
  const [filterRoleId, setFilterRoleId] = useState<string | null>(null);
  const [filterReviewStatus, setFilterReviewStatus] =
    useState<ReviewStatusFilterValue>(null);

  const filters: LogsUrlFilters = {
    activeTags,
    filterAthleteId,
    filterSessionId,
    filterRoleId,
    filterReviewStatus,
    dateFilter,
    customDates,
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
    setCustomDates(null);
  }, []);

  const clearAllOnGroupChange = useCallback(() => {
    setFilterAthleteId(null);
    setFilterSessionId(null);
    setFilterRoleId(null);
    setFilterReviewStatus(null);
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveTags([]);
    setDateFilter("all");
    setCustomDates(null);
    setFilterAthleteId(null);
    setFilterSessionId(null);
    setFilterRoleId(null);
    setFilterReviewStatus(null);
  }, []);

  const filtersState: DashboardFiltersState = {
    activeTags,
    dateFilter,
    customDates,
    filterAthleteId,
    filterSessionId,
    filterRoleId,
    filterReviewStatus,
  };

  const handlers: DashboardFiltersHandlers = {
    handleToggleTag,
    handleClearTags,
    setDateFilter,
    setCustomDates,
    handleFilterAthlete,
    setFilterSessionId,
    setFilterRoleId,
    setFilterReviewStatus,
    clearDateFilter,
    clearAllOnGroupChange,
    clearAllFilters,
  };

  return {
    filters: filtersState,
    handlers,
    logsUrl,
  };
}
