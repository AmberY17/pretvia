"use client";

import { AnimatePresence } from "framer-motion";
import { CheckinCardItem } from "@/components/main/dashboard/checkins/checkin-card/checkin-card-item";
import { CheckinComposer } from "@/components/main/dashboard/checkins/checkin-card/checkin-composer";
import type { CheckinItem, TrainingSlot } from "@/types/dashboard";

interface CheckinCardProps {
  checkins: CheckinItem[];
  isCoach: boolean;
  onCheckinLog: (sessionDate: string, checkinId: string) => void;
  onEditCheckinLog?: (logId: string) => void;
  onMutate: () => void;
  trainingScheduleTemplate?: TrainingSlot[];
}

export function CheckinCard({
  checkins,
  isCoach,
  onCheckinLog,
  onEditCheckinLog,
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
            onEditCheckinLog={onEditCheckinLog}
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
