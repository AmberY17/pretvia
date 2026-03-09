"use client";

import { AnimatePresence } from "framer-motion";
import { CheckinCardItem } from "@/components/dashboard/shared/checkin-card/checkin-card-item";
import { CheckinComposer } from "@/components/dashboard/shared/checkin-card/checkin-composer";
import type { CheckinItem } from "@/types/dashboard";

export type { CheckinItem };

interface CheckinCardProps {
  checkins: CheckinItem[];
  isCoach: boolean;
  onCheckinLog: (sessionDate: string, checkinId: string) => void;
  onMutate: () => void;
  trainingScheduleTemplate?: { dayOfWeek: number; time: string }[];
}

export function CheckinCard({
  checkins,
  isCoach,
  onCheckinLog,
  onMutate,
  trainingScheduleTemplate,
}: CheckinCardProps) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      <AnimatePresence>
        {checkins.map((checkin) => (
          <CheckinCardItem
            key={checkin.id}
            checkin={checkin}
            isCoach={isCoach}
            onCheckinLog={onCheckinLog}
            onMutate={onMutate}
          />
        ))}
      </AnimatePresence>
      {isCoach && (
        <CheckinComposer
          onMutate={onMutate}
          trainingScheduleTemplate={trainingScheduleTemplate}
        />
      )}
    </div>
  );
}
