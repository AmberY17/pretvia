"use client";

import { useMemo } from "react";
import { format, startOfWeek, eachDayOfInterval, isToday } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

type AttendanceStatus = "present" | "absent" | "excused";

interface GuardianCalendarWeeklyProps {
  weekStart: string;
  dates: Record<string, string>;
  attendanceByDate?: Record<string, AttendanceStatus>;
  trainingDayDates?: Record<string, boolean>;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

export function GuardianCalendarWeekly({
  weekStart,
  dates,
  attendanceByDate = {},
  trainingDayDates = {},
  onPrevWeek,
  onNextWeek,
}: GuardianCalendarWeeklyProps) {
  const weekStartDate = useMemo(() => new Date(weekStart + "T12:00:00"), [weekStart]);
  const days = useMemo(() => {
    const start = startOfWeek(weekStartDate, { weekStartsOn: 0 });
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return eachDayOfInterval({ start, end });
  }, [weekStartDate]);

  const weekLabel = `${format(days[0], "MMM d")} – ${format(days[6], "MMM d, yyyy")}`;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrevWeek}
          className="h-9 w-9 shrink-0"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-base font-semibold text-foreground">{weekLabel}</h2>
        <Button
          variant="outline"
          size="icon"
          onClick={onNextWeek}
          className="h-9 w-9 shrink-0"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {WEEKDAYS_FULL.map((d, i) => (
          <div
            key={i}
            className="py-1 text-center text-[10px] font-medium text-muted-foreground sm:text-xs"
            title={d}
          >
            <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const emoji = dates[key];
          const attendance = attendanceByDate[key];
          const hasEmoji = !!emoji;
          const today = isToday(day);
          const isActive = hasEmoji || !!attendance || !!trainingDayDates[key];
          const borderColor =
            attendance === "present"
              ? "border-emerald-500/60"
              : attendance === "absent"
                ? "border-red-500/60"
                : attendance === "excused"
                  ? "border-amber-500/60"
                  : "border-transparent";

          return (
            <div
              key={key}
              className={cn(
                "relative flex min-h-[48px] flex-col items-center justify-center rounded-lg border p-1 transition-colors sm:min-h-[44px]",
                isActive ? "text-foreground" : "opacity-50 text-muted-foreground",
                today && !attendance && "border-primary/30",
                attendance && borderColor
              )}
            >
              {hasEmoji ? (
                <>
                  <span className="absolute left-1 top-1 text-[10px] font-medium">{format(day, "d")}</span>
                  <span className="text-2xl leading-none" role="img" aria-label="log mood">
                    {emoji}
                  </span>
                </>
              ) : (
                <span className="text-xs font-medium">{format(day, "d")}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
