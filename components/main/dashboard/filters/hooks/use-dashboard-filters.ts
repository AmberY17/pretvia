"use client"

import { useState, useCallback, useMemo } from "react"
import type { DateFilterKey, CustomDateSelection } from "@/lib/date-utils"
import {
  useLogsUrl,
  type LogsUrlFilters,
} from "@/components/main/dashboard/filters/hooks/use-logs-url"
import type { ReviewStatus, VisibilityFilterValue } from "@/types/dashboard"

export interface DashboardFiltersState {
  activeTags: string[]
  dateFilter: DateFilterKey
  customDates: CustomDateSelection | null
  filterAthleteIds: string[]
  filterSessionIds: string[]
  filterRoleIds: string[]
  filterReviewStatuses: ReviewStatus[]
  filterVisibility: VisibilityFilterValue
}

export interface DashboardFiltersHandlers {
  handleToggleTag: (tag: string) => void
  handleClearTags: () => void
  setDateFilter: (value: DateFilterKey) => void
  setCustomDates: (value: CustomDateSelection | null) => void
  toggleFilterAthleteId: (id: string) => void
  clearFilterAthleteIds: () => void
  toggleFilterSessionId: (id: string) => void
  clearFilterSessionIds: () => void
  toggleFilterRoleId: (id: string) => void
  clearFilterRoleIds: () => void
  toggleFilterReviewStatus: (value: ReviewStatus) => void
  clearFilterReviewStatuses: () => void
  setFilterVisibility: (value: VisibilityFilterValue) => void
  clearDateFilter: () => void
  clearAllOnGroupChange: () => void
  clearAllFilters: () => void
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

export function useDashboardFilters() {
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<DateFilterKey>("all")
  const [customDates, setCustomDates] = useState<CustomDateSelection | null>(null)
  const [filterAthleteIds, setFilterAthleteIds] = useState<string[]>([])
  const [filterSessionIds, setFilterSessionIds] = useState<string[]>([])
  const [filterRoleIds, setFilterRoleIds] = useState<string[]>([])
  const [filterReviewStatuses, setFilterReviewStatuses] = useState<ReviewStatus[]>([])
  const [filterVisibility, setFilterVisibility] = useState<VisibilityFilterValue>(null)

  const filters: LogsUrlFilters = {
    activeTags,
    filterAthleteIds,
    filterSessionIds,
    filterRoleIds,
    filterReviewStatuses,
    filterVisibility,
    dateFilter,
    customDates,
  }

  const logsUrl = useLogsUrl(filters)

  const handleToggleTag = useCallback((tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }, [])

  const handleClearTags = useCallback(() => setActiveTags([]), [])

  const toggleFilterAthleteId = useCallback((id: string) => {
    setFilterAthleteIds((prev) => toggle(prev, id))
  }, [])
  const clearFilterAthleteIds = useCallback(() => setFilterAthleteIds([]), [])

  const toggleFilterSessionId = useCallback((id: string) => {
    setFilterSessionIds((prev) => toggle(prev, id))
  }, [])
  const clearFilterSessionIds = useCallback(() => setFilterSessionIds([]), [])

  const toggleFilterRoleId = useCallback((id: string) => {
    setFilterRoleIds((prev) => toggle(prev, id))
  }, [])
  const clearFilterRoleIds = useCallback(() => setFilterRoleIds([]), [])

  const toggleFilterReviewStatus = useCallback((value: ReviewStatus) => {
    setFilterReviewStatuses((prev) => toggle(prev, value))
  }, [])
  const clearFilterReviewStatuses = useCallback(() => setFilterReviewStatuses([]), [])

  const clearDateFilter = useCallback(() => {
    setDateFilter("all")
    setCustomDates(null)
  }, [])

  const clearAllOnGroupChange = useCallback(() => {
    setFilterAthleteIds([])
    setFilterSessionIds([])
    setFilterRoleIds([])
    setFilterReviewStatuses([])
    setFilterVisibility(null)
  }, [])

  const clearAllFilters = useCallback(() => {
    setActiveTags([])
    setDateFilter("all")
    setCustomDates(null)
    setFilterAthleteIds([])
    setFilterSessionIds([])
    setFilterRoleIds([])
    setFilterReviewStatuses([])
    setFilterVisibility(null)
  }, [])

  const filtersState: DashboardFiltersState = useMemo(
    () => ({
      activeTags,
      dateFilter,
      customDates,
      filterAthleteIds,
      filterSessionIds,
      filterRoleIds,
      filterReviewStatuses,
      filterVisibility,
    }),
    [
      activeTags,
      dateFilter,
      customDates,
      filterAthleteIds,
      filterSessionIds,
      filterRoleIds,
      filterReviewStatuses,
      filterVisibility,
    ],
  )

  const handlers: DashboardFiltersHandlers = useMemo(
    () => ({
      handleToggleTag,
      handleClearTags,
      setDateFilter,
      setCustomDates,
      toggleFilterAthleteId,
      clearFilterAthleteIds,
      toggleFilterSessionId,
      clearFilterSessionIds,
      toggleFilterRoleId,
      clearFilterRoleIds,
      toggleFilterReviewStatus,
      clearFilterReviewStatuses,
      setFilterVisibility,
      clearDateFilter,
      clearAllOnGroupChange,
      clearAllFilters,
    }),
    [
      handleToggleTag,
      handleClearTags,
      setDateFilter,
      setCustomDates,
      toggleFilterAthleteId,
      clearFilterAthleteIds,
      toggleFilterSessionId,
      clearFilterSessionIds,
      toggleFilterRoleId,
      clearFilterRoleIds,
      toggleFilterReviewStatus,
      clearFilterReviewStatuses,
      setFilterVisibility,
      clearDateFilter,
      clearAllOnGroupChange,
      clearAllFilters,
    ],
  )

  return {
    filters: filtersState,
    handlers,
    logsUrl,
  }
}
