"use client";

import { Calendar, Plus, Loader2, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DAYS } from "@/lib/constants";
import type { TrainingSlotItem } from "@/types/dashboard";

interface AccountTrainingSlotsSectionProps {
  trainingSlots: TrainingSlotItem[];
  hasGroupId: boolean;
  syncingSchedule: boolean;
  deleteGroupSlotConfirmIndex: number | null;
  setDeleteGroupSlotConfirmIndex: (v: number | null) => void;
  onAddSlot: () => void;
  onRemoveSlot: (index: number) => void;
  onUpdateSlot: (
    index: number,
    field: "dayOfWeek" | "time",
    value: number | string,
  ) => void;
  onSyncGroupSchedule: () => void;
  onConfirmRemoveGroupSlot: () => void;
  isGroupSlot: (slot: TrainingSlotItem) => boolean;
}

export function AccountTrainingSlotsSection({
  trainingSlots,
  hasGroupId,
  syncingSchedule,
  deleteGroupSlotConfirmIndex,
  setDeleteGroupSlotConfirmIndex,
  onAddSlot,
  onRemoveSlot,
  onUpdateSlot,
  onSyncGroupSchedule,
  onConfirmRemoveGroupSlot,
  isGroupSlot,
}: AccountTrainingSlotsSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Calendar className="h-4 w-4" />
          Training schedule
        </h2>
        {hasGroupId && (
          <Button
            variant="ghost-secondary"
            size="sm"
            className="h-8 shrink-0 gap-1.5"
            onClick={onSyncGroupSchedule}
            disabled={syncingSchedule}
            aria-label="Sync with group"
          >
            {syncingSchedule ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sync with group
          </Button>
        )}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Set your weekly training schedule. Group schedule set by Coach cannot be
        modified. Streaks are based on logging within 24 hours of each
        scheduled slot.
      </p>
      <div className="flex flex-col gap-3">
        {trainingSlots.map((slot, index) => {
          const isGroup = isGroupSlot(slot);
          return (
            <div
              key={index}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/50 p-3"
            >
              <select
                value={slot.dayOfWeek}
                onChange={(e) =>
                  onUpdateSlot(index, "dayOfWeek", Number(e.target.value))
                }
                disabled={!!isGroup}
                className="h-9 flex-1 min-w-[120px] rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
              >
                {DAYS.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={slot.time}
                onChange={(e) => onUpdateSlot(index, "time", e.target.value)}
                disabled={!!isGroup}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
              />
              <Button
                variant="ghost-secondary"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() =>
                  isGroup
                    ? setDeleteGroupSlotConfirmIndex(index)
                    : onRemoveSlot(index)
                }
                aria-label={
                  isGroup ? "Remove group schedule slot" : "Remove slot"
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        <Button
          variant="ghost-secondary"
          size="sm"
          className="w-fit"
          onClick={onAddSlot}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add schedule slot
        </Button>
      </div>
      <AlertDialog
        open={deleteGroupSlotConfirmIndex !== null}
        onOpenChange={(open) => !open && setDeleteGroupSlotConfirmIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete the group schedule?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this group schedule slot. You can bring it back
              anytime with Sync.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmRemoveGroupSlot}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
