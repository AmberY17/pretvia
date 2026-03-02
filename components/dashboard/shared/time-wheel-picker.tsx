"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { WheelPicker, WheelPickerWrapper } from "@ncdai/react-wheel-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MINUTES = ["00", "15", "30", "45"];
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));
const MINUTE_OPTIONS = MINUTES.map((m) => ({ value: m, label: m }));
const AMPM_OPTIONS = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
];

const WHEEL_CLASSNAMES = {
  optionItem: "text-muted-foreground text-sm",
  highlightWrapper: "bg-muted/50 rounded",
  highlightItem: "text-primary font-medium text-sm",
};

function parseTime(value: string): {
  hour12: string;
  minute: string;
  ampm: "AM" | "PM";
} {
  const match = String(value || "09:00").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hour12: "9", minute: "00", ampm: "AM" };
  const h24 = Math.max(0, Math.min(23, parseInt(match[1]!, 10)));
  const m = parseInt(match[2]!, 10);
  const minuteKey =
    MINUTES.find((x) => Math.abs(parseInt(x, 10) - m) <= 7) ?? "00";
  const hour12 = h24 === 0 ? "12" : h24 > 12 ? String(h24 - 12) : String(h24);
  const ampm = h24 < 12 ? "AM" : "PM";
  return { hour12, minute: minuteKey, ampm };
}

function toHHmm(hour12: string, minute: string, ampm: string): string {
  let h = parseInt(hour12, 10);
  if (ampm === "AM") h = h === 12 ? 0 : h;
  else h = h === 12 ? 12 : h + 12;
  return `${h.toString().padStart(2, "0")}:${minute}`;
}

interface TimeWheelPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimeWheelPicker({ value, onChange, disabled }: TimeWheelPickerProps) {
  const [open, setOpen] = useState(false);
  const { hour12, minute, ampm } = parseTime(value);
  const displayValue = `${hour12}:${minute} ${ampm}`;

  const handleChange = (h: string, m: string, a: string) => {
    onChange(toHHmm(h, m, a));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Select time"
          className={cn(
            "flex h-9 w-[140px] flex-shrink-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-colors",
            "hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-background"
          )}
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            {displayValue}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="w-[192px] rounded-lg border border-border bg-card p-2">
          <WheelPickerWrapper className="flex gap-1">
            <WheelPicker
              options={HOUR_OPTIONS}
              value={hour12}
              onValueChange={(h) => handleChange(h, minute, ampm)}
              classNames={WHEEL_CLASSNAMES}
              optionItemHeight={32}
              visibleCount={12}
            />
            <WheelPicker
              options={MINUTE_OPTIONS}
              value={minute}
              onValueChange={(m) => handleChange(hour12, m, ampm)}
              classNames={WHEEL_CLASSNAMES}
              optionItemHeight={32}
              visibleCount={12}
            />
            <WheelPicker
              options={AMPM_OPTIONS}
              value={ampm}
              onValueChange={(a) => handleChange(hour12, minute, a)}
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
