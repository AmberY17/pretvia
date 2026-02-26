"use client";

import { X, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { DateFilterKey } from "@/lib/date-utils";

const DATE_OPTIONS = [
  { key: "all" as const, label: "All Time", mobileLabel: "All" },
  { key: "today" as const, label: "Today", mobileLabel: "Today" },
  { key: "7d" as const, label: "Last 7 Days", mobileLabel: "7 Days" },
  { key: "30d" as const, label: "Last 30 Days", mobileLabel: "30 Days" },
] as const;

interface DateFilterProps {
  dateFilter: DateFilterKey;
  customDate: string;
  onDateFilterChange: (value: DateFilterKey) => void;
  onCustomDateChange: (value: string) => void;
  onClear: () => void;
  variant?: "sidebar" | "mobile";
  hideHeader?: boolean;
  /** When true, renders as a bare row with no outer wrapper div (for use inside a gap container) */
  inline?: boolean;
}

export function DateFilter({
  dateFilter,
  customDate,
  onDateFilterChange,
  onCustomDateChange,
  onClear,
  variant = "sidebar",
  hideHeader = false,
  inline = false,
}: DateFilterProps) {
  const isSidebar = variant === "sidebar";

  const options = DATE_OPTIONS.map((opt) => ({
    ...opt,
    label: isSidebar ? opt.label : opt.mobileLabel,
  }));

  const buttonBase =
    "text-xs transition-colors " +
    (isSidebar
      ? "flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      : "inline-flex items-center gap-1 rounded-full px-2.5 py-1");

  const buttonActive = "bg-primary/10 font-medium text-primary";
  const buttonInactive = isSidebar
    ? "text-muted-foreground hover:bg-secondary hover:text-foreground"
    : "bg-secondary text-muted-foreground hover:text-foreground";

  const sidebarContent = (
    <div className="flex flex-col gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => {
            onDateFilterChange(opt.key);
            onCustomDateChange("");
          }}
          className={`${buttonBase} ${
            dateFilter === opt.key ? buttonActive : buttonInactive
          }`}
        >
          {opt.label}
        </button>
      ))}
      <div className="mt-1 flex items-center gap-2">
        <input
          type="date"
          value={customDate}
          onChange={(e) => {
            onCustomDateChange(e.target.value);
            if (e.target.value) onDateFilterChange("custom");
            else onDateFilterChange("all");
          }}
          className={`w-full rounded-lg border border-border bg-secondary px-2 py-1 text-xs text-foreground ${
            dateFilter === "custom"
              ? "border-primary/30 ring-1 ring-primary/20"
              : ""
          }`}
        />
      </div>
    </div>
  );

  if (isSidebar) {
    if (hideHeader) {
      return <div className="min-w-0">{sidebarContent}</div>;
    }
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Date Range
          </h3>
          {dateFilter !== "all" && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear date filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {sidebarContent}
      </div>
    );
  }

  // Mobile pill row — calendar icon replaces the raw date input
  const formattedDate =
    customDate
      ? (() => {
          try {
            return format(new Date(customDate + "T00:00:00"), "MMM d");
          } catch {
            return null;
          }
        })()
      : null;

  const mobilePills = (
    <>
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => {
            onDateFilterChange(opt.key);
            onCustomDateChange("");
          }}
          className={`shrink-0 ${buttonBase} ${
            dateFilter === opt.key ? buttonActive : buttonInactive
          }`}
        >
          {opt.label}
        </button>
      ))}
      {/* Calendar icon button backed by a hidden date input */}
      <label
        className={`shrink-0 cursor-pointer ${buttonBase} ${
          dateFilter === "custom" ? buttonActive : buttonInactive
        }`}
        aria-label="Pick a date"
      >
        <input
          type="date"
          value={customDate}
          onChange={(e) => {
            onCustomDateChange(e.target.value);
            if (e.target.value) onDateFilterChange("custom");
            else onDateFilterChange("all");
          }}
          className="sr-only"
        />
        {formattedDate ? (
          <span className="flex items-center gap-1">
            {formattedDate}
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              onClick={(e) => {
                e.preventDefault();
                onCustomDateChange("");
                onDateFilterChange("all");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onCustomDateChange("");
                  onDateFilterChange("all");
                }
              }}
              className="ml-0.5 rounded-full hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </span>
          </span>
        ) : (
          <Calendar className="h-3.5 w-3.5" />
        )}
      </label>
    </>
  );

  if (inline) {
    return <div className="flex items-center gap-1.5">{mobilePills}</div>;
  }

  return (
    <div className="mb-4 flex items-center gap-1.5 overflow-x-auto scrollbar-hidden lg:hidden">
      {mobilePills}
    </div>
  );
}
