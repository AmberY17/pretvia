"use client";

import { useState } from "react";
import Link from "next/link";
import { Flame, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const SKIP_DISABLED_MESSAGES: Record<
  "no_training" | "already_skipped" | "already_logged",
  string
> = {
  no_training: "No scheduled training today",
  already_skipped: "Already skipped. Made a mistake? Add a log to undo it.",
  already_logged: "Already logged",
};

interface SidebarStatsCardProps {
  totalLogs: number;
  streak: number;
  hasTrainingSlots: boolean;
  canSkipToday: boolean;
  skipDisabledReason:
    | "no_training"
    | "already_skipped"
    | "already_logged"
    | null;
  onMutateStats: () => void;
}

export function SidebarStatsCard({
  totalLogs,
  streak,
  hasTrainingSlots,
  canSkipToday,
  skipDisabledReason,
  onMutateStats,
}: SidebarStatsCardProps) {
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [skipping, setSkipping] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleSkip = async () => {
    if (!skipReason.trim()) {
      toast.error("Please enter a reason");
      return;
    }
    setSkipping(true);
    try {
      const res = await fetch("/api/skipped-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayStr, reason: skipReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to skip");
        return;
      }
      setSkipOpen(false);
      setSkipReason("");
      onMutateStats();
    } catch {
      toast.error("Network error");
    } finally {
      setSkipping(false);
    }
  };

  const skipButton = (
    <Button
      variant="ghost-secondary"
      size="sm"
      className="h-7 text-xs"
      onClick={() => setSkipOpen(true)}
      disabled={!canSkipToday}
    >
      Skip today
    </Button>
  );

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {totalLogs} {totalLogs === 1 ? "log" : "logs"}
            </span>
          </div>
          {hasTrainingSlots && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Flame className="h-4 w-4 text-orange-500" />
                {streak} training day{streak !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {hasTrainingSlots &&
              (canSkipToday ? (
                skipButton
              ) : (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">{skipButton}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {skipDisabledReason
                          ? SKIP_DISABLED_MESSAGES[skipDisabledReason]
                          : "Skip today's training"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            <Link href="/dashboard/account">
              <Button
                variant="ghost-secondary"
                size="sm"
                className="h-7 text-xs"
              >
                {hasTrainingSlots ? "Edit schedule" : "Set up schedule"}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Dialog open={skipOpen} onOpenChange={setSkipOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Skip today&apos;s training</DialogTitle>
            <DialogDescription>
              Briefly explain why you&apos;re skipping. This keeps your streak
              intact.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="skip-reason">Reason</Label>
              <Textarea
                id="skip-reason"
                placeholder="e.g. rest day, travel, illness"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost-secondary"
              onClick={() => setSkipOpen(false)}
              disabled={skipping}
            >
              Cancel
            </Button>
            <Button
              variant="ghost-primary"
              onClick={handleSkip}
              disabled={skipping || !skipReason.trim()}
            >
              {skipping ? <Loader2 className="h-4 w-4 animate-spin" /> : "Skip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
