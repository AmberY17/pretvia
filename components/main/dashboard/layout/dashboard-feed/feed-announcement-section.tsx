"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AnnouncementBanner } from "@/components/main/dashboard/announcements";
import { AnnouncementSkeleton } from "../dashboard-skeletons";
import type { Announcement } from "@/types/dashboard";

interface FeedAnnouncementSectionProps {
  show: boolean;
  loading: boolean;
  announcements: Announcement[];
  isCoach: boolean;
  currentUserId?: string;
  onMutate: () => void;
}

export function FeedAnnouncementSection({
  show,
  loading,
  announcements,
  isCoach,
  currentUserId,
  onMutate,
}: FeedAnnouncementSectionProps) {
  if (!show) return null;

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="popLayout">
        {loading ? (
          <motion.div
            key="announcement-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <AnnouncementSkeleton isCoach={isCoach} />
          </motion.div>
        ) : (
          <motion.div
            key="announcement-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.3, ease: "easeOut" } }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
          >
            <AnnouncementBanner
              announcements={announcements}
              isCoach={isCoach}
              currentUserId={currentUserId}
              onMutate={onMutate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
