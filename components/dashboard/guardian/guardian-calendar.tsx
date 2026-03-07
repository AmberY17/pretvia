"use client";

import { useState, useMemo, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

type AttendanceStatus = "present" | "absent" | "excused";

interface GuardianCalendarProps {
  month: string;
  dates: Record<string, string>;
  attendanceByDate?: Record<string, AttendanceStatus>;
  trainingDayDates?: Record<string, boolean>;
  onMonthChange: (month: string) => void;
}

export function GuardianCalendar({ month, dates, attendanceByDate = {}, trainingDayDates = {}, onMonthChange }: GuardianCalendarProps) {
  const [current, setCurrent] = useState(() => {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });

  useEffect(() => {
    const [y, m] = month.split("-").map(Number);
    setCurrent(new Date(y, m - 1, 1));
  }, [month]);

  const monthStart = useMemo(() => startOfMonth(current), [current]);
  const monthEnd = useMemo(() => endOfMonth(current), [current]);

  const days = useMemo(() => {
    const start = new Date(monthStart);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(monthEnd);
    end.setDate(end.getDate() + (6 - end.getDay()));
    return eachDayOfInterval({ start, end });
  }, [monthStart, monthEnd]);

  const handlePrev = () => {
    const next = subMonths(current, 1);
    setCurrent(next);
    onMonthChange(format(next, "yyyy-MM"));
  };

  const handleNext = () => {
    const next = addMonths(current, 1);
    setCurrent(next);
    onMonthChange(format(next, "yyyy-MM"));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          className="h-9 w-9 shrink-0"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-base font-semibold text-foreground">
          {format(current, "MMMM yyyy")}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="h-9 w-9 shrink-0"
          aria-label="Next month"
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
          const inMonth = isSameMonth(day, current);
          const today = isToday(day);
          const hasEmoji = !!emoji;
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
                attendance && borderColor,
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
                <>
                  <span className="text-xs font-medium">{format(day, "d")}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
