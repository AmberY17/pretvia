"use client"

import { useMemo } from "react"
import type { DateFilterKey, CustomDateSelection } from "@/lib/date-utils"
import { getDateFilterParams } from "@/lib/date-utils"
import type { ReviewStatus, VisibilityFilterValue } from "@/types/dashboard"

export interface LogsUrlFilters {
  activeTags: string[]
  filterAthleteIds: string[]
  filterSessionIds: string[]
  filterRoleIds: string[]
  filterReviewStatuses: ReviewStatus[]
  filterVisibility: VisibilityFilterValue
  dateFilter: DateFilterKey
  customDates: CustomDateSelection | null
}

export function buildLogsUrl(filters: LogsUrlFilters): string {
  const params = new URLSearchParams()
  filters.activeTags.forEach((t) => params.append("tag", t))
  filters.filterAthleteIds.forEach((id) => params.append("userId", id))
  filters.filterSessionIds.forEach((id) => params.append("checkinId", id))
  filters.filterRoleIds.forEach((id) => params.append("roleId", id))
  filters.filterReviewStatuses.forEach((s) => params.append("reviewStatus", s))
  if (filters.filterVisibility) params.set("visibility", filters.filterVisibility)

  const { dateFrom, dateTo, dates } = getDateFilterParams(filters.dateFilter, filters.customDates)
  if (dateFrom) params.set("dateFrom", dateFrom)
  if (dateTo) params.set("dateTo", dateTo)
  if (dates) params.set("dates", dates)

  const qs = params.toString()
  return qs ? `/api/logs?${qs}` : "/api/logs"
}

export function useLogsUrl(filters: LogsUrlFilters): string {
  return useMemo(
    () => buildLogsUrl(filters),
    [
      filters.activeTags.join(","),
      filters.filterAthleteIds.join(","),
      filters.filterSessionIds.join(","),
      filters.filterRoleIds.join(","),
      filters.filterReviewStatuses.join(","),
      filters.filterVisibility,
      filters.dateFilter,
      filters.customDates?.join(",") ?? "",
    ],
  )
}
