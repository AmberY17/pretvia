"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { PageHeader } from "@/components/main/shared";
import { LoadingScreen } from "@/components/loading-screen";
import {
  AccountProfileEmojiSection,
  AccountTrainingSlotsSection,
  AccountCelebrationSection,
  AccountFilterOrderSection,
  AccountDeleteSection,
  AccountInstallSection,
} from "@/components/main/account";
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
import { useTrainingSlots } from "@/hooks/use-training-slots";
import type { TrainingSlotItem } from "@/types/dashboard";

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, mutate: mutateAuth } = useRequireAuth();
  const [profileEmoji, setProfileEmoji] = useState<string>("");
  const [savingEmoji, setSavingEmoji] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterOrder, setFilterOrder] = useState<CoachFilterId[]>([
    ...DEFAULT_COACH_ORDER,
  ]);
  const [celebrationEnabled, setCelebrationEnabled] = useState(true);
  const {
    slots: trainingSlots,
    setSlots: setTrainingSlots,
    addSlot: addTrainingSlot,
    removeSlot: removeTrainingSlot,
    updateSlot: updateTrainingSlot,
  } = useTrainingSlots();
  // Slots from other groups that are hidden on this page but must be preserved
  // when saving so that other groups' schedules are not accidentally deleted.
  const [hiddenGroupSlots, setHiddenGroupSlots] = useState<TrainingSlotItem[]>([]);
  const [, setSavingSlots] = useState(false);
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

  // Sync training slots from server when user id or active group changes.
  // Only show slots for the active group + personal (no sourceGroupId) slots;
  // slots from other groups are stashed in hiddenGroupSlots so they are
  // preserved when saving (not silently deleted).
  useEffect(() => {
    if (!user?.id || user?.trainingSlots === undefined) return;
    const activeGroupId = user.activeGroupId ?? null;
    const allRaw = Array.isArray(user.trainingSlots)
      ? user.trainingSlots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          time: s.time || "09:00",
          sourceGroupId: (s as { sourceGroupId?: string }).sourceGroupId,
        }))
      : [];
    // Slots from other groups: hidden from display but kept for save merging
    const hidden = allRaw.filter(
      (s) => s.sourceGroupId && s.sourceGroupId !== activeGroupId,
    );
    // Slots visible on this page: personal + active group's coach-set slots
    const visible = allRaw.filter(
      (s) => !s.sourceGroupId || s.sourceGroupId === activeGroupId,
    );
    const slots = sortSlotsChronologically(visible);
    setHiddenGroupSlots(hidden);
    setTrainingSlots(slots);
    lastSavedTrainingSlotsRef.current = slots;
    trainingScheduleSaveSkippedRef.current = false;
  }, [user?.id, user?.activeGroupId]);

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
    slots: TrainingSlotItem[],
    _options?: { silent?: boolean },
  ) {
    setSavingSlots(true);
    const activeGroupId = user?.activeGroupId ?? null;
    try {
      // Stamp any slot that lacks a sourceGroupId with the current activeGroupId so that
      // every slot is group-scoped before it reaches the database.
      const stamped = slots.map((s) =>
        s.sourceGroupId ? s : activeGroupId ? { ...s, sourceGroupId: activeGroupId } : s,
      );
      // Re-merge hidden slots from other groups so they are not lost on save.
      const merged = [...stamped, ...hiddenGroupSlots];
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainingSlots: merged }),
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

  const isGroupSlot = (slot: TrainingSlotItem): boolean =>
    !!(user?.activeGroupId && slot.sourceGroupId === user.activeGroupId);

  const handleConfirmRemoveGroupSlot = async () => {
    if (deleteGroupSlotConfirmIndex === null) return;
    const index = deleteGroupSlotConfirmIndex;
    setDeleteGroupSlotConfirmIndex(null);
    const nextSlots = trainingSlots.filter((_, i) => i !== index);
    setTrainingSlots(nextSlots);
    await saveTrainingSlotsToServer(nextSlots, { silent: true });
  };

  const handleSyncGroupSchedule = async () => {
    if (!user?.activeGroupId) return;
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
        const activeGroupId = user?.activeGroupId ?? null;
        const allRaw = data.trainingSlots.map(
          (s: TrainingSlotItem) => ({
            dayOfWeek: s.dayOfWeek,
            time: s.time || "09:00",
            sourceGroupId: s.sourceGroupId,
          }),
        );
        // Re-filter after sync: show only active group + personal, stash the rest
        const hidden = allRaw.filter(
          (s: { sourceGroupId?: string }) => s.sourceGroupId && s.sourceGroupId !== activeGroupId,
        );
        const visible = allRaw.filter(
          (s: { sourceGroupId?: string }) => !s.sourceGroupId || s.sourceGroupId === activeGroupId,
        );
        const nextSlots = sortSlotsChronologically(visible);
        setHiddenGroupSlots(hidden);
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
    <div className="flex h-screen flex-col overflow-hidden">
      <PageHeader title="Account Settings" />

      <main className="flex-1 overflow-y-auto scrollbar-hidden p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <AccountProfileEmojiSection
            profileEmoji={profileEmoji}
            savingEmoji={savingEmoji}
            onEmojiChange={handleEmojiChange}
          />

          {user.role === "athlete" && (
            <AccountTrainingSlotsSection
              trainingSlots={trainingSlots}
              hasGroupId={!!user.activeGroupId}
              syncingSchedule={syncingSchedule}
              deleteGroupSlotConfirmIndex={deleteGroupSlotConfirmIndex}
              setDeleteGroupSlotConfirmIndex={setDeleteGroupSlotConfirmIndex}
              onAddSlot={() => addTrainingSlot(user.activeGroupId ?? undefined)}
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

          <AccountInstallSection />

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
