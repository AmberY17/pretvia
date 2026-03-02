"use client";

import { useState, useCallback } from "react";

interface TrainingSlotState {
  dayOfWeek: number;
  time: string;
  sourceGroupId?: string;
}

export function useTrainingSlots(
  initial: TrainingSlotState[] = [],
) {
  const [slots, setSlots] = useState<TrainingSlotState[]>(initial);

  const addSlot = useCallback(() => {
    setSlots((prev) => [...prev, { dayOfWeek: 1, time: "09:00" }]);
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
