"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckinCard } from "@/components/dashboard/shared/checkin-card";
import { CheckinSkeleton } from "@/components/dashboard/main/dashboard-skeletons";
import type { CheckinItem } from "@/types/dashboard";

interface FeedCheckinSectionProps {
  show: boolean;
  loading: boolean;
  checkins: CheckinItem[];
  isCoach: boolean;
  trainingScheduleTemplate?: { dayOfWeek: number; time: string }[];
  onCheckinLog: (sessionDate: string, checkinId: string) => void;
  onMutate: () => void;
}

export function FeedCheckinSection({
  show,
  loading,
  checkins,
  isCoach,
  trainingScheduleTemplate,
  onCheckinLog,
  onMutate,
}: FeedCheckinSectionProps) {
  if (!show) return null;

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="checkin-skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <CheckinSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key="checkin-content"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{
            delay: 0.04,
            duration: 0.55,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          <CheckinCard
            checkins={checkins}
            isCoach={isCoach}
            onCheckinLog={onCheckinLog}
            onMutate={onMutate}
            trainingScheduleTemplate={trainingScheduleTemplate}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
