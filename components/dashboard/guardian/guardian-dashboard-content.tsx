"use client";

import { useState } from "react";
import { Calendar, CalendarDays, ChevronDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GuardianCalendar } from "./guardian-calendar";
import { GuardianCalendarWeekly } from "./guardian-calendar-weekly";
import { GuardianCalendarSkeleton } from "@/components/dashboard/main/dashboard-skeletons";
import type { GuardianPair } from "./guardian-sidebar";

type CalendarData = {
  athleteId: string;
  groupId: string;
  athleteName: string;
  groupName: string;
  dates: Record<string, string>;
  attendanceByDate: Record<string, "present" | "absent" | "excused">;
  trainingDayDates?: Record<string, true>;
};

interface GuardianDashboardContentProps {
  availablePairs: GuardianPair[];
  selectedPairs: GuardianPair[];
  onSelectedPairsChange: (pairs: GuardianPair[]) => void;
  calendars: CalendarData[];
  isLoading: boolean;
  viewMode: "month" | "week";
  onViewModeChange: (mode: "month" | "week") => void;
  month: string;
  onMonthChange: (month: string) => void;
  weekStart: string;
  onWeekChange: (delta: number) => void;
}

function pairKey(p: GuardianPair) {
  return `${p.athleteId}:${p.groupId}`;
}

export function GuardianDashboardContent({
  availablePairs,
  selectedPairs,
  onSelectedPairsChange,
  calendars,
  isLoading,
  viewMode,
  onViewModeChange,
  month,
  onMonthChange,
  weekStart,
  onWeekChange,
}: GuardianDashboardContentProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const selectedSet = new Set(selectedPairs.map(pairKey));

  const togglePair = (p: GuardianPair) => {
    if (selectedSet.has(pairKey(p))) {
      onSelectedPairsChange(selectedPairs.filter((x) => pairKey(x) !== pairKey(p)));
    } else {
      onSelectedPairsChange([...selectedPairs, p]);
    }
  };

  const AthletesPopover = () => (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between gap-2 lg:w-auto"
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {selectedPairs.length === 0
              ? "Select athletes & groups"
              : selectedPairs.length === 1
                ? `${selectedPairs[0].athleteName} – ${selectedPairs[0].groupName}`
                : `${selectedPairs.length} selected`}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(320px,85vw)] p-3" align="start" side="bottom">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Athletes & groups
        </p>
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
          {availablePairs.map((p) => {
            const key = pairKey(p);
            const checked = selectedSet.has(key);
            return (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePair(p)}
                  className="rounded border-border"
                />
                <span className="truncate text-foreground">
                  {p.athleteName} – {p.groupName}
                </span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );

  if (selectedPairs.length === 0) {
    return (
      <main className="flex flex-1 flex-col overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <div className="lg:hidden">
            <AthletesPopover />
          </div>
          <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Select athletes and groups to view calendars.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="lg:hidden">
              <AthletesPopover />
            </div>
            <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onViewModeChange("month")}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "month"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Month
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("week")}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "week"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              Week
            </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            <GuardianCalendarSkeleton />
          </div>
        ) : (
          <div className="space-y-8">
            {calendars.map((cal) => (
              <div key={`${cal.athleteId}:${cal.groupId}`}>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  {cal.athleteName} – {cal.groupName}
                </h3>
                {viewMode === "month" ? (
                  <GuardianCalendar
                    month={month}
                    dates={cal.dates}
                    attendanceByDate={cal.attendanceByDate}
                    trainingDayDates={cal.trainingDayDates ?? {}}
                    onMonthChange={onMonthChange}
                  />
                ) : (
                  <GuardianCalendarWeekly
                    weekStart={weekStart}
                    dates={cal.dates}
                    attendanceByDate={cal.attendanceByDate}
                    trainingDayDates={cal.trainingDayDates ?? {}}
                    onPrevWeek={() => onWeekChange(-1)}
                    onNextWeek={() => onWeekChange(1)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
