"use client";

import { useState, useCallback } from "react";
import type { TrainingSlotItem } from "@/types/dashboard";

export function useTrainingSlots(
  initial: TrainingSlotItem[] = [],
) {
  const [slots, setSlots] = useState<TrainingSlotItem[]>(initial);

  const addSlot = useCallback((sourceGroupId?: string) => {
    setSlots((prev) => [
      ...prev,
      sourceGroupId
        ? { dayOfWeek: 1, time: "09:00", sourceGroupId }
        : { dayOfWeek: 1, time: "09:00" },
    ]);
  }, []);

  const removeSlot = useCallback((index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateSlot = useCallback(
    (index: number, field: "dayOfWeek" | "time", value: number | string) => {
      setSlots((prev) =>
        prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
      );
    },
    [],
  );

  return { slots, setSlots, addSlot, removeSlot, updateSlot };
}
