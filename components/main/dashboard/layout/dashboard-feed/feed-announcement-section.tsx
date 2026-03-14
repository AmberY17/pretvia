"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AnnouncementBanner } from "@/components/main/dashboard/announcements/announcement-banner";
import { AnnouncementSkeleton } from "@/components/main/dashboard/layout/dashboard-skeletons";
import type { Announcement } from "@/types/dashboard";

interface FeedAnnouncementSectionProps {
  show: boolean;
  loading: boolean;
  announcements: Announcement[];
  isCoach: boolean;
  onMutate: () => void;
}

export function FeedAnnouncementSection({
  show,
  loading,
  announcements,
  isCoach,
  onMutate,
}: FeedAnnouncementSectionProps) {
  if (!show) return null;

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="announcement-skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <AnnouncementSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key="announcement-content"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <AnnouncementBanner
            announcements={announcements}
            isCoach={isCoach}
            onMutate={onMutate}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
