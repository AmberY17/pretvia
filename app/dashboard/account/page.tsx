"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { AccountProfileEmojiSection } from "@/components/dashboard/account/account-profile-emoji-section";
import { AccountTrainingSlotsSection } from "@/components/dashboard/account/account-training-slots-section";
import { AccountCelebrationSection } from "@/components/dashboard/account/account-celebration-section";
import { AccountFilterOrderSection } from "@/components/dashboard/account/account-filter-order-section";
import { AccountDeleteSection } from "@/components/dashboard/account/account-delete-section";
import { toast } from "sonner";
import {
  CELEBRATION_KEY,
  COACH_FILTER_ORDER_KEY,
  DEFAULT_COACH_ORDER,
  type CoachFilterId,
} from "@/lib/constants";
import { type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { sortSlotsChronologically } from "@/lib/training-slot-utils";
import type { TrainingSlotItem } from "@/types/dashboard";

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, mutate: mutateAuth } = useAuth();
  const [profileEmoji, setProfileEmoji] = useState<string>("");
  const [savingEmoji, setSavingEmoji] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterOrder, setFilterOrder] = useState<CoachFilterId[]>([
    ...DEFAULT_COACH_ORDER,
  ]);
  const [celebrationEnabled, setCelebrationEnabled] = useState(true);
  const [trainingSlots, setTrainingSlots] = useState<
    { dayOfWeek: number; time: string; sourceGroupId?: string }[]
  >([]);
  const [savingSlots, setSavingSlots] = useState(false);
  const [deleteGroupSlotConfirmIndex, setDeleteGroupSlotConfirmIndex] =
    useState<number | null>(null);
  const [syncingSchedule, setSyncingSchedule] = useState(false);
  const trainingScheduleSaveSkippedRef = useRef(false);
  const lastSavedTrainingSlotsRef = useRef<typeof trainingSlots | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;
    try {
      const stored = localStorage.getItem(`${CELEBRATION_KEY}-${user.id}`);
      if (stored !== null) {
        setCelebrationEnabled(stored === "true");
      }
    } catch {
      // ignore
    }
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;
    try {
      const stored = localStorage.getItem(`${COACH_FILTER_ORDER_KEY}-${user.id}`);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        const valid = DEFAULT_COACH_ORDER.filter((id) => parsed.includes(id));
        if (valid.length === DEFAULT_COACH_ORDER.length) {
          setFilterOrder(parsed as CoachFilterId[]);
        }
      }
    } catch {
      // ignore
    }
  }, [user?.id]);

  const handleFilterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filterOrder.indexOf(active.id as CoachFilterId);
    const newIndex = filterOrder.indexOf(over.id as CoachFilterId);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(filterOrder, oldIndex, newIndex);
    setFilterOrder(newOrder);
    if (user?.id) {
      localStorage.setItem(`${COACH_FILTER_ORDER_KEY}-${user.id}`, JSON.stringify(newOrder));
    }
  };

  useEffect(() => {
    if (user?.profileEmoji !== undefined) {
      setProfileEmoji(user.profileEmoji || "");
    }
  }, [user?.profileEmoji]);

  // Sync training slots from server only on initial load (user id), so other
  // profile updates (e.g. emoji) don’t overwrite unsaved schedule changes.
  useEffect(() => {
    if (!user?.id || user?.trainingSlots === undefined) return;
    const raw =
      Array.isArray(user.trainingSlots) && user.trainingSlots.length > 0
        ? user.trainingSlots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            time: s.time || "09:00",
            sourceGroupId: (s as { sourceGroupId?: string }).sourceGroupId,
          }))
        : [];
    const slots = sortSlotsChronologically(raw);
    setTrainingSlots(slots);
    lastSavedTrainingSlotsRef.current = slots;
    trainingScheduleSaveSkippedRef.current = false;
  }, [user?.id]);

  // Auto-save training schedule when it changes (debounced). Skip the first run after load.
  useEffect(() => {
    if (user?.role !== "athlete") return;
    if (!trainingScheduleSaveSkippedRef.current) {
      trainingScheduleSaveSkippedRef.current = true;
      return;
    }
    if (trainingSlots === lastSavedTrainingSlotsRef.current) return;
    const timeout = setTimeout(() => {
      saveTrainingSlotsToServer(trainingSlots);
    }, 600);
    return () => clearTimeout(timeout);
  }, [user?.role, trainingSlots]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [authLoading, user, router]);

  const handleEmojiChange = async (emoji: string) => {
    setSavingEmoji(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileEmoji: emoji }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update");
        return;
      }
      setProfileEmoji(emoji);
      mutateAuth();
    } catch {
      toast.error("Network error");
    } finally {
      setSavingEmoji(false);
    }
  };

  async function saveTrainingSlotsToServer(
    slots: { dayOfWeek: number; time: string; sourceGroupId?: string }[],
    options?: { silent?: boolean },
  ) {
    setSavingSlots(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainingSlots: slots }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update training slots");
        return;
      }
      mutateAuth();
      lastSavedTrainingSlotsRef.current = slots;
    } catch {
      toast.error("Network error");
    } finally {
      setSavingSlots(false);
    }
  }

  const addTrainingSlot = () => {
    setTrainingSlots((prev) => [...prev, { dayOfWeek: 1, time: "09:00" }]);
  };

  const removeTrainingSlot = (index: number) => {
    setTrainingSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const isGroupSlot = (slot: TrainingSlotItem): boolean =>
    !!(user?.groupId && slot.sourceGroupId === user.groupId);

  const handleConfirmRemoveGroupSlot = async () => {
    if (deleteGroupSlotConfirmIndex === null) return;
    const index = deleteGroupSlotConfirmIndex;
    setDeleteGroupSlotConfirmIndex(null);
    const nextSlots = trainingSlots.filter((_, i) => i !== index);
    setTrainingSlots(nextSlots);
    await saveTrainingSlotsToServer(nextSlots, { silent: true });
  };

  const handleSyncGroupSchedule = async () => {
    if (!user?.groupId) return;
    setSyncingSchedule(true);
    try {
      const res = await fetch("/api/athlete/sync-group-schedule", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to sync group schedule");
        return;
      }
      if (Array.isArray(data.trainingSlots)) {
        const raw = data.trainingSlots.map(
          (s: { dayOfWeek: number; time: string; sourceGroupId?: string }) => ({
            dayOfWeek: s.dayOfWeek,
            time: s.time || "09:00",
            sourceGroupId: s.sourceGroupId,
          }),
        );
        const nextSlots = sortSlotsChronologically(raw);
        setTrainingSlots(nextSlots);
        lastSavedTrainingSlotsRef.current = nextSlots;
      }
      mutateAuth();
    } catch {
      toast.error("Network error");
    } finally {
      setSyncingSchedule(false);
    }
  };

  const updateTrainingSlot = (
    index: number,
    field: "dayOfWeek" | "time",
    value: number | string,
  ) => {
    setTrainingSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete account");
        return;
      }
      mutateAuth();
      router.push("/");
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  if (authLoading || !user) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Account Settings" />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <AccountProfileEmojiSection
            profileEmoji={profileEmoji}
            savingEmoji={savingEmoji}
            onEmojiChange={handleEmojiChange}
          />

          {user.role === "athlete" && (
            <AccountTrainingSlotsSection
              trainingSlots={trainingSlots}
              hasGroupId={!!user.groupId}
              syncingSchedule={syncingSchedule}
              deleteGroupSlotConfirmIndex={deleteGroupSlotConfirmIndex}
              setDeleteGroupSlotConfirmIndex={setDeleteGroupSlotConfirmIndex}
              onAddSlot={addTrainingSlot}
              onRemoveSlot={removeTrainingSlot}
              onUpdateSlot={updateTrainingSlot}
              onSyncGroupSchedule={handleSyncGroupSchedule}
              onConfirmRemoveGroupSlot={handleConfirmRemoveGroupSlot}
              isGroupSlot={isGroupSlot}
            />
          )}

          {user.role === "athlete" && (
            <AccountCelebrationSection
              celebrationEnabled={celebrationEnabled}
              onCelebrationChange={setCelebrationEnabled}
              userId={user.id}
            />
          )}

          {user.role === "coach" && (
            <AccountFilterOrderSection
              filterOrder={filterOrder}
              onFilterDragEnd={handleFilterDragEnd}
            />
          )}

          <AccountDeleteSection
            deleteConfirmOpen={deleteConfirmOpen}
            setDeleteConfirmOpen={setDeleteConfirmOpen}
            deleting={deleting}
            onDeleteAccount={handleDeleteAccount}
          />
        </div>
      </main>
    </div>
  );
}
