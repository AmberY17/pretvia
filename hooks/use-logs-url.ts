"use client";

import { useMemo } from "react";
import type {
  DateFilterKey,
  CustomDateSelection,
} from "@/lib/date-utils";
import { getDateFilterParams } from "@/lib/date-utils";

export interface LogsUrlFilters {
  activeTags: string[];
  filterAthleteId: string | null;
  filterSessionId: string | null;
  filterRoleId: string | null;
  filterReviewStatus: "pending" | "reviewed" | "revisit" | null;
  dateFilter: DateFilterKey;
  customDates: CustomDateSelection | null;
}

export function buildLogsUrl(filters: LogsUrlFilters): string {
  const params = new URLSearchParams();
  filters.activeTags.forEach((t) => params.append("tag", t));
  if (filters.filterAthleteId) params.set("userId", filters.filterAthleteId);
  if (filters.filterSessionId)
    params.set("checkinId", filters.filterSessionId);
  if (filters.filterRoleId) params.set("roleId", filters.filterRoleId);
  if (filters.filterReviewStatus)
    params.set("reviewStatus", filters.filterReviewStatus);

  const { dateFrom, dateTo, dates } = getDateFilterParams(
    filters.dateFilter,
    filters.customDates,
  );
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  if (dates) params.set("dates", dates);

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
      filters.filterReviewStatus,
      filters.dateFilter,
      filters.customDates?.join(",") ?? "",
    ],
  );
}
