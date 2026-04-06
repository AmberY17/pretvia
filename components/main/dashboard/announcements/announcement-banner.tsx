"use client";

import { AnimatePresence } from "framer-motion";
import { AnnouncementItem } from "@/components/main/dashboard/announcements/announcement-banner/announcement-item";
import { AnnouncementComposer } from "@/components/main/dashboard/announcements/announcement-banner/announcement-composer";
import type { Announcement } from "@/types/dashboard";

interface AnnouncementBannerProps {
  announcements: Announcement[];
  isCoach: boolean;
  currentUserId?: string;
  onMutate: () => void;
}

export function AnnouncementBanner({
  announcements,
  isCoach,
  currentUserId,
  onMutate,
}: AnnouncementBannerProps) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      <AnimatePresence>
        {announcements.map((announcement) => (
          <AnnouncementItem
            key={announcement.id}
            announcement={announcement}
            isCoach={isCoach}
            currentUserId={currentUserId}
            onMutate={onMutate}
          />
        ))}
      </AnimatePresence>
      {isCoach && <AnnouncementComposer onMutate={onMutate} />}
    </div>
  );
}
