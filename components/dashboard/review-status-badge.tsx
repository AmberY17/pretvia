"use client";

import { useCallback } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Circle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReviewStatus = "pending" | "reviewed" | "revisit";

const STATUS_CONFIG: Record<
  ReviewStatus,
  { label: string; className: string; Icon: typeof Circle }
> = {
  pending: {
    label: "Pending",
    className:
      "bg-secondary text-muted-foreground border-border hover:bg-secondary/80",
    Icon: Circle,
  },
  reviewed: {
    label: "Reviewed",
    className: "bg-primary/10 text-primary border-primary/20",
    Icon: Check,
  },
  revisit: {
    label: "Revisit",
    className: "bg-checkin/10 text-checkin border-checkin/20",
    Icon: RotateCcw,
  },
};

interface ReviewStatusBadgeProps {
  logId: string;
  status: ReviewStatus;
  onChange?: (status: ReviewStatus) => void;
  disabled?: boolean;
  onMutate?: () => void;
}

export function ReviewStatusBadge({
  logId,
  status,
  onChange,
  disabled,
  onMutate,
}: ReviewStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.Icon;

  const handleSelect = useCallback(
    async (newStatus: ReviewStatus) => {
      if (newStatus === status || disabled) return;
      try {
        const res = await fetch(`/api/logs/${logId}/review`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Failed to update");
        onChange?.(newStatus);
        onMutate?.();
      } catch {
        // Could add toast
      }
    },
    [logId, status, disabled, onChange, onMutate]
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:pointer-events-none",
            config.className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon className="h-3 w-3" />
          {config.label}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[140px] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
          align="end"
          sideOffset={4}
          onClick={(e) => e.stopPropagation()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {(["pending", "reviewed", "revisit"] as const).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const CfgIcon = cfg.Icon;
            const isSelected = s === status;
            return (
              <DropdownMenu.Item
                key={s}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none hover:bg-secondary focus:bg-secondary"
                onSelect={(e) => {
                  e.preventDefault();
                  handleSelect(s);
                }}
              >
                <CfgIcon className="h-3 w-3" />
                {cfg.label}
                {isSelected && <Check className="ml-auto h-3 w-3" />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
