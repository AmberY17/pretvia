"use client";

import { Calendar, Plus, Loader2, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAYS } from "@/lib/constants";

interface TrainingSlot {
  dayOfWeek: number;
  time: string;
}

interface GroupTrainingScheduleSectionProps {
  trainingSchedule: TrainingSlot[];
  onAddSlot: () => void;
  onRemoveSlot: (index: number) => void;
  onUpdateSlot: (
    index: number,
    field: "dayOfWeek" | "time",
    value: number | string,
  ) => void;
  onSave: () => void;
  saving: boolean;
}

export function GroupTrainingScheduleSection({
  trainingSchedule,
  onAddSlot,
  onRemoveSlot,
  onUpdateSlot,
  onSave,
  saving,
}: GroupTrainingScheduleSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
        <Calendar className="h-4 w-4" />
        Training schedule
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Set a default training schedule for this group. Athletes in this group
        will have these slots applied to their account, and they can still add
        their own custom training schedule entries.
      </p>
      <div className="flex flex-col gap-3">
        {trainingSchedule.map((slot, index) => (
          <div
            key={index}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/50 p-3"
          >
            <div className="relative flex flex-1 min-w-[120px]">
              <select
                value={slot.dayOfWeek}
                onChange={(e) =>
                  onUpdateSlot(index, "dayOfWeek", Number(e.target.value))
                }
                className="h-9 w-full appearance-none rounded-md border border-border bg-background pl-4 pr-10 text-sm text-foreground"
              >
                {DAYS.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
            </div>
            <input
              type="time"
              value={slot.time}
              onChange={(e) => onUpdateSlot(index, "time", e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            />
            <Button
              variant="ghost-secondary"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onRemoveSlot(index)}
              aria-label="Remove slot"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost-secondary"
          size="sm"
          className="w-fit"
          onClick={onAddSlot}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add schedule slot
        </Button>
        {trainingSchedule.length > 0 && (
          <Button
            variant="ghost-primary"
            size="sm"
            className="w-fit"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        )}
      </div>
    </section>
  );
}
