"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckinCard } from "@/components/main/dashboard/checkins";
import { CheckinSkeleton } from "../dashboard-skeletons";
import type { CheckinItem, TrainingSlot } from "@/types/dashboard";

interface FeedCheckinSectionProps {
  show: boolean;
  loading: boolean;
  checkins: CheckinItem[];
  isCoach: boolean;
  trainingScheduleTemplate?: TrainingSlot[];
  onCheckinLog: (sessionDate: string, checkinId: string) => void;
  onEditCheckinLog?: (logId: string) => void;
  onMutate: () => void;
}

export function FeedCheckinSection({
  show,
  loading,
  checkins,
  isCoach,
  trainingScheduleTemplate,
  onCheckinLog,
  onEditCheckinLog,
  onMutate,
}: FeedCheckinSectionProps) {
  if (!show) return null;

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="popLayout">
        {loading ? (
          <motion.div
            key="checkin-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <CheckinSkeleton isCoach={isCoach} />
          </motion.div>
        ) : (
          <motion.div
            key="checkin-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.3, ease: "easeOut" } }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
          >
            <CheckinCard
              checkins={checkins}
              isCoach={isCoach}
              onCheckinLog={onCheckinLog}
              onEditCheckinLog={onEditCheckinLog}
              onMutate={onMutate}
              trainingScheduleTemplate={trainingScheduleTemplate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
