"use client";

import * as React from "react";
import { X } from "lucide-react";
import { format } from "date-fns";
import type { DateFilterKey, CustomDateSelection } from "@/lib/date-utils";
import { DateMultiplePicker } from "@/components/ui/date-multiple-picker";
import { cn } from "@/lib/utils";

const DATE_OPTIONS = [
  { key: "all" as const, label: "All Time", mobileLabel: "All" },
  { key: "today" as const, label: "Today", mobileLabel: "Today" },
  { key: "7d" as const, label: "Last 7 Days", mobileLabel: "7 Days" },
  { key: "30d" as const, label: "Last 30 Days", mobileLabel: "30 Days" },
] as const;

function toDates(custom: CustomDateSelection | null): Date[] | undefined {
  if (!custom?.length) return undefined;
  return custom
    .map((s) => {
      const d = new Date(s + "T00:00:00");
      return Number.isNaN(d.getTime()) ? null : d;
    })
    .filter((d): d is Date => d !== null);
}

function fromDates(dates: Date[] | undefined): CustomDateSelection | null {
  if (!dates?.length) return null;
  return dates.map((d) => format(d, "yyyy-MM-dd"));
}

interface DateFilterProps {
  dateFilter: DateFilterKey;
  customDates: CustomDateSelection | null;
  onDateFilterChange: (value: DateFilterKey) => void;
  onCustomDatesChange: (value: CustomDateSelection | null) => void;
  onClear: () => void;
  variant?: "sidebar" | "mobile";
  hideHeader?: boolean;
  /** When true, renders as a bare row with no outer wrapper div (for use inside a gap container) */
  inline?: boolean;
}

export function DateFilter({
  dateFilter,
  customDates,
  onDateFilterChange,
  onCustomDatesChange,
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

  const dates = toDates(customDates);

  const buttonBase =
    "text-xs transition-colors " +
    (isSidebar
      ? "flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      : "inline-flex items-center gap-1 rounded-full px-2.5 py-1");

  const buttonActive = "bg-primary/10 font-medium text-primary";
  const buttonInactive = isSidebar
    ? "text-muted-foreground hover:bg-secondary hover:text-foreground"
    : "bg-secondary text-muted-foreground hover:text-foreground";

  const handleSelect = (selected: Date[] | undefined) => {
    const next = fromDates(selected);
    onCustomDatesChange(next);
    if (next?.length) onDateFilterChange("custom");
    else onDateFilterChange("all");
  };

  const datePicker = (
    <DateMultiplePicker
      value={dates}
      onChange={handleSelect}
      placeholder="Pick dates"
      variant="compact"
      className="rounded-lg"
    />
  );

  const sidebarContent = (
    <div className="flex flex-col gap-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => {
            onDateFilterChange(opt.key);
            onCustomDatesChange(null);
          }}
          className={`${buttonBase} ${
            dateFilter === opt.key ? buttonActive : buttonInactive
          }`}
        >
          {opt.label}
        </button>
      ))}
      <div className="mt-1">{datePicker}</div>
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
            Date
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

  const mobileDatePicker = (
    <DateMultiplePicker
      value={dates}
      onChange={handleSelect}
      placeholder="Pick dates"
      variant="compact"
      hideIconWhenSelected
      iconOnlyWhenEmpty
      numberOfMonths={1}
      className={cn(
        "shrink-0 w-auto rounded-full",
        dateFilter === "custom" ? buttonActive : buttonInactive
      )}
    />
  );

  const mobilePills = (
    <>
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => {
            onDateFilterChange(opt.key);
            onCustomDatesChange(null);
          }}
          className={`shrink-0 ${buttonBase} ${
            dateFilter === opt.key ? buttonActive : buttonInactive
          }`}
        >
          {opt.label}
        </button>
      ))}
      {mobileDatePicker}
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
