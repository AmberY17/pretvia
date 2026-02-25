import type { TrainingSlotItem } from "@/types/dashboard";

export function sortSlotsChronologically(
  slots: TrainingSlotItem[],
): TrainingSlotItem[] {
  return [...slots].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return (a.time || "00:00").localeCompare(b.time || "00:00");
  });
}
