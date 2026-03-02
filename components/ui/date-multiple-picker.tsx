"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateMultiplePickerProps {
  value?: Date[];
  onChange: (dates: Date[] | undefined) => void;
  onClose?: () => void;
  placeholder?: string;
  className?: string;
  id?: string;
  /** "default" = h-11, "compact" = h-6 text-xs */
  variant?: "default" | "compact";
  /** When true (e.g. on mobile), show calendar icon only when no dates are selected */
  hideIconWhenSelected?: boolean;
  /** When true and no dates selected, show only the calendar icon (no placeholder text, no chevron) */
  iconOnlyWhenEmpty?: boolean;
  /** Number of months to display (default 2) */
  numberOfMonths?: number;
}

export function DateMultiplePicker({
  value,
  onChange,
  onClose,
  placeholder = "Pick dates",
  className,
  id,
  variant = "default",
  hideIconWhenSelected = false,
  iconOnlyWhenEmpty = false,
  numberOfMonths = 2,
}: DateMultiplePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Close popover when viewport crosses desktop/mobile breakpoint (lg: 1024px)
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => setOpen(false);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const handleSelect = (dates: Date[] | undefined) => {
    if (!dates || dates.length === 0) {
      onChange(undefined);
    } else {
      onChange(dates);
    }
  };

  const displayText = React.useMemo(() => {
    if (!value || value.length === 0) return null;
    const sorted = [...value].sort((a, b) => a.getTime() - b.getTime());
    if (sorted.length <= 2) {
      return sorted.map((d) => format(d, "LLL d")).join(", ");
    }
    return `${sorted.length} dates`;
  }, [value]);

  const isCompact = variant === "compact";
  const isEmpty = !value?.length;
  const showIconOnly = iconOnlyWhenEmpty && isEmpty;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "font-normal transition-all hover:bg-muted hover:text-foreground focus:ring-2 focus:ring-primary/20 min-w-0",
            showIconOnly
              ? "h-6 min-w-[1.5rem] justify-center px-2.5 py-1 border-0"
              : "w-full justify-start text-left",
            !showIconOnly && (isCompact ? "h-6 text-xs" : "h-11 text-sm"),
            !showIconOnly && isEmpty && "text-muted-foreground",
            className,
          )}
          aria-label={showIconOnly ? "Pick dates" : undefined}
        >
          {(!hideIconWhenSelected || isEmpty) && (
            <CalendarIcon
              className={cn(
                "shrink-0 opacity-70",
                showIconOnly ? "size-4" : "mr-2",
                !showIconOnly && (isCompact ? "h-3.5 w-3.5" : "h-4 w-4"),
              )}
            />
          )}
          {!showIconOnly && (
            <span className="min-w-0 flex-1 truncate">
              {displayText ?? placeholder}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-muted/20 shadow-xl"
        align="start"
      >
        <Calendar
          mode="multiple"
          defaultMonth={value?.[0] ?? new Date()}
          selected={value}
          onSelect={handleSelect}
          numberOfMonths={numberOfMonths}
          className="p-3 rounded-lg border-0"
        />
      </PopoverContent>
    </Popover>
  );
}
