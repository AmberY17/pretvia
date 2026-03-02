"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface CollapsibleFilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CollapsibleFilterSection({
  title,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: CollapsibleFilterSectionProps) {
  const isControlled = controlledOpen !== undefined;
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      open={isControlled ? controlledOpen : undefined}
      onOpenChange={isControlled ? onOpenChange : undefined}
      className="group"
    >
      <div className="rounded-xl border border-border bg-card">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left",
              "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
              "transition-colors hover:bg-secondary/50 hover:text-foreground",
              "focus:outline-none"
            )}
          >
            <span>{title}</span>
            <ChevronDown
              className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border px-3 py-3">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
