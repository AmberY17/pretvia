"use client";

import { useState } from "react";
import { WheelPicker, WheelPickerWrapper } from "@ncdai/react-wheel-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DAYS } from "@/lib/constants";

const DAY_OPTIONS = DAYS.map((name, i) => ({ value: i, label: name }));

const WHEEL_CLASSNAMES = {
  optionItem: "text-muted-foreground text-sm",
  highlightWrapper: "bg-muted/50 rounded",
  highlightItem: "text-primary font-medium text-sm",
};

interface DayWheelPickerProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function DayWheelPicker({ value, onChange, disabled }: DayWheelPickerProps) {
  const [open, setOpen] = useState(false);
  const dayIndex = Math.max(0, Math.min(6, value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Select day of week"
          className={cn(
            "flex h-9 w-[140px] flex-shrink-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-colors",
            "hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-background"
          )}
        >
          {DAYS[dayIndex]}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="w-[160px] rounded-lg border border-border bg-card p-2">
          <WheelPickerWrapper className="flex">
            <WheelPicker<number>
              options={DAY_OPTIONS}
              value={dayIndex}
              onValueChange={(v) => {
                onChange(v);
                setOpen(false);
              }}
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
