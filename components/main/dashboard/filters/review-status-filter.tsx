"use client"

import { X } from "lucide-react"
import type { ReviewStatus } from "@/types/dashboard"

interface ReviewStatusFilterProps {
  filterReviewStatuses: ReviewStatus[]
  onToggle: (value: ReviewStatus) => void
  onClear: () => void
  variant?: "sidebar" | "mobile"
  hideHeader?: boolean
}

const OPTIONS: { value: ReviewStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "revisit", label: "Revisit" },
]

export function ReviewStatusFilter({
  filterReviewStatuses,
  onToggle,
  onClear,
  variant = "sidebar",
  hideHeader = false,
}: ReviewStatusFilterProps) {
  const isSidebar = variant === "sidebar"
  const hasSelection = filterReviewStatuses.length > 0

  const buttonBase =
    "text-xs transition-colors " +
    (isSidebar
      ? "flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      : "inline-flex items-center gap-1 rounded-full px-2.5 py-1")

  const buttonActive = "bg-primary text-primary-foreground font-medium"
  const buttonInactive = isSidebar
    ? "text-muted-foreground hover:bg-secondary hover:text-foreground"
    : "bg-secondary text-muted-foreground hover:text-foreground"

  const sidebarContent = (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={onClear}
        className={`${buttonBase} ${!hasSelection ? buttonActive : buttonInactive}`}
      >
        All
      </button>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onToggle(opt.value)}
          className={`${buttonBase} ${
            filterReviewStatuses.includes(opt.value) ? buttonActive : buttonInactive
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )

  if (isSidebar) {
    if (hideHeader) {
      return <div className="min-w-0">{sidebarContent}</div>
    }
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Review status
          </h3>
          {hasSelection && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear review status filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {sidebarContent}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hidden lg:hidden">
      <button
        type="button"
        onClick={onClear}
        className={`shrink-0 ${buttonBase} ${!hasSelection ? buttonActive : buttonInactive}`}
      >
        All
      </button>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scrollbar-hidden">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={`shrink-0 ${buttonBase} ${
              filterReviewStatuses.includes(opt.value) ? buttonActive : buttonInactive
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
