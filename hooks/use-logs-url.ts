"use client";

import { useMemo } from "react";
import type { DateFilterKey } from "@/lib/date-utils";
import { getDateRangeParams } from "@/lib/date-utils";

export interface LogsUrlFilters {
  activeTags: string[];
  filterAthleteId: string | null;
  filterSessionId: string | null;
  filterRoleId: string | null;
  dateFilter: DateFilterKey;
  customDate: string;
}

export function buildLogsUrl(filters: LogsUrlFilters): string {
  const params = new URLSearchParams();
  filters.activeTags.forEach((t) => params.append("tag", t));
  if (filters.filterAthleteId) params.set("userId", filters.filterAthleteId);
  if (filters.filterSessionId)
    params.set("checkinId", filters.filterSessionId);
  if (filters.filterRoleId) params.set("roleId", filters.filterRoleId);

  const { dateFrom, dateTo } = getDateRangeParams(
    filters.dateFilter,
    filters.customDate,
  );
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  const qs = params.toString();
  return qs ? `/api/logs?${qs}` : "/api/logs";
}

export function useLogsUrl(filters: LogsUrlFilters): string {
  return useMemo(
    () => buildLogsUrl(filters),
    [
      filters.activeTags.join(","),
      filters.filterAthleteId,
      filters.filterSessionId,
      filters.filterRoleId,
      filters.dateFilter,
      filters.customDate,
    ],
  );
}
