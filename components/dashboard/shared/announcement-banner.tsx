"use client";

import { AnimatePresence } from "framer-motion";
import { AnnouncementItem } from "@/components/dashboard/shared/announcement-banner/announcement-item";
import { AnnouncementComposer } from "@/components/dashboard/shared/announcement-banner/announcement-composer";
import type { Announcement } from "@/types/dashboard";

interface AnnouncementBannerProps {
  announcements: Announcement[];
  isCoach: boolean;
  onMutate: () => void;
}

export function AnnouncementBanner({
  announcements,
  isCoach,
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
            onMutate={onMutate}
          />
        ))}
      </AnimatePresence>
      {isCoach && <AnnouncementComposer onMutate={onMutate} />}
    </div>
  );
}
