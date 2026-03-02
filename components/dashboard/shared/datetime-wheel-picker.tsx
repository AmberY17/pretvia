"use client";

import { useState, useMemo } from "react";
import { format, addDays, subDays } from "date-fns";
import { CalendarClock } from "lucide-react";
import { WheelPicker, WheelPickerWrapper } from "@ncdai/react-wheel-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => ({
  value: i.toString().padStart(2, "0"),
  label: i.toString().padStart(2, "0"),
}));
const AMPM_OPTIONS = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
];

const WHEEL_CLASSNAMES = {
  optionItem: "text-muted-foreground text-sm",
  highlightWrapper: "bg-muted/50 rounded",
  highlightItem: "text-primary font-medium text-sm",
};

function parseDatetime(value: string): {
  dateStr: string;
  hour12: string;
  minute: string;
  ampm: "AM" | "PM";
} {
  const d = value ? new Date(value) : new Date();
  // Use local date parts to avoid timezone issues with toISOString
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const dateStr = `${y}-${m}-${day}`;
  const h24 = d.getHours();
  const hour12 = h24 === 0 ? "12" : h24 > 12 ? String(h24 - 12) : String(h24);
  const minute = d.getMinutes().toString().padStart(2, "0");
  const ampm = h24 < 12 ? "AM" : "PM";
  return { dateStr, hour12, minute, ampm };
}

function toDatetime(
  dateStr: string,
  hour12: string,
  minute: string,
  ampm: string
): string {
  let h = parseInt(hour12, 10);
  if (ampm === "AM") h = h === 12 ? 0 : h;
  else h = h === 12 ? 12 : h + 12;
  return `${dateStr}T${h.toString().padStart(2, "0")}:${minute}`;
}

function getDateOptions(center?: Date): { value: string; label: string }[] {
  const today = center ?? new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = -60; i <= 60; i++) {
    const d = i < 0 ? subDays(today, -i) : addDays(today, i);
    const value = format(d, "yyyy-MM-dd");
    const label = format(d, "EEE MMM d");
    options.push({ value, label });
  }
  return options;
}

interface DateTimeWheelPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DateTimeWheelPicker({
  value,
  onChange,
  disabled,
  className,
}: DateTimeWheelPickerProps) {
  const [open, setOpen] = useState(false);
  const { dateStr, hour12, minute, ampm } = parseDatetime(value);
  const dateOptions = useMemo(() => getDateOptions(), []);

  const displayValue = useMemo(() => {
    const d = new Date(value || new Date().toISOString());
    return format(d, "EEE, MMM d, h:mm a");
  }, [value]);

  const handleChange = (
    d: string,
    h: string,
    m: string,
    a: string
  ) => {
    onChange(toDatetime(d, h, m, a));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Select date and time"
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground ring-offset-background transition-colors",
            "hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-secondary",
            className
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
            {displayValue}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="w-[320px] rounded-lg border border-border bg-card p-2">
          <WheelPickerWrapper className="flex gap-1">
            {/* Date column gets 2x flex-grow so labels like "Thu Feb 19" don't wrap */}
            <div className="min-w-0 flex-[2]">
              <WheelPicker
                options={dateOptions}
                value={dateStr}
                onValueChange={(d) => handleChange(d, hour12, minute, ampm)}
                classNames={WHEEL_CLASSNAMES}
                optionItemHeight={32}
                visibleCount={12}
              />
            </div>
            <WheelPicker
              options={HOUR_OPTIONS}
              value={hour12}
              onValueChange={(h) => handleChange(dateStr, h, minute, ampm)}
              classNames={WHEEL_CLASSNAMES}
              optionItemHeight={32}
              visibleCount={12}
            />
            <WheelPicker
              options={MINUTE_OPTIONS}
              value={minute}
              onValueChange={(m) => handleChange(dateStr, hour12, m, ampm)}
              classNames={WHEEL_CLASSNAMES}
              optionItemHeight={32}
              visibleCount={12}
            />
            <WheelPicker
              options={AMPM_OPTIONS}
              value={ampm}
              onValueChange={(a) => handleChange(dateStr, hour12, minute, a)}
              classNames={WHEEL_CLASSNAMES}
              optionItemHeight={32}
              visibleCount={12}
            />
          </WheelPickerWrapper>
        </div>
      </PopoverContent>
    </Popover>
  );
}
