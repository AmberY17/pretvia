"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Trash2,
  Loader2,
  SlidersHorizontal,
  PartyPopper,
  Calendar,
  Plus,
  GripVertical,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { EmojiPicker } from "@/components/dashboard/emoji-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { CELEBRATION_KEY } from "@/components/dashboard/confetti-celebration";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TrainingSlotItem = {
  dayOfWeek: number;
  time: string;
  sourceGroupId?: string;
};

function sortSlotsChronologically(
  slots: TrainingSlotItem[],
): TrainingSlotItem[] {
  return [...slots].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return (a.time || "00:00").localeCompare(b.time || "00:00");
  });
}

const COACH_FILTER_ORDER_KEY = "prets-coach-filter-order";
const DEFAULT_COACH_ORDER = [
  "sessions",
  "role",
  "reviewStatus",
  "athlete",
  "date",
] as const;

const FILTER_LABELS: Record<(typeof DEFAULT_COACH_ORDER)[number], string> = {
  sessions: "Training Sessions",
  role: "Role",
  reviewStatus: "Review Status",
  athlete: "Athlete",
  date: "Date",
};

type CoachFilterId = (typeof DEFAULT_COACH_ORDER)[number];

function SortableFilterItem({
  id,
  label,
}: {
  id: CoachFilterId;
  label: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag to reorder ${label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

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
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(CELEBRATION_KEY);
      if (stored !== null) {
        setCelebrationEnabled(stored === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(COACH_FILTER_ORDER_KEY);
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
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleFilterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filterOrder.indexOf(active.id as CoachFilterId);
    const newIndex = filterOrder.indexOf(over.id as CoachFilterId);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(filterOrder, oldIndex, newIndex);
    setFilterOrder(newOrder);
    localStorage.setItem(COACH_FILTER_ORDER_KEY, JSON.stringify(newOrder));
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
      router.push("/");
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

  const isGroupSlot = (slot: { sourceGroupId?: string }) =>
    user?.groupId && slot.sourceGroupId === user.groupId;

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

  const DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between gap-4 px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden shrink-0 items-center gap-2 text-muted-foreground transition-colors hover:text-foreground lg:flex lg:w-[4.5rem]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </Link>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center">
              <Image
                src="/logo.png"
                alt="Pretvia"
                width={24}
                height={24}
                className="h-6 w-6 object-contain dark:hidden"
              />
              <Image
                src="/logo_dark_white.png"
                alt="Pretvia"
                width={24}
                height={24}
                className="hidden h-6 w-6 object-contain dark:block"
              />
            </div>
            <span className="truncate text-base font-semibold text-foreground">
              Account Settings
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Profile emoji section */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <User className="h-4 w-4" />
              Profile Emoji
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Choose an emoji to represent you. It will appear next to your name
              in the sidebar and in comments.
            </p>
            <div className="flex items-center gap-4">
              <div className="relative">
                <EmojiPicker
                  value={profileEmoji}
                  onChange={handleEmojiChange}
                />
                {savingEmoji && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/60">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 items-center gap-2">
                {!profileEmoji && (
                  <p className="text-sm text-muted-foreground">
                    Click to choose an emoji
                  </p>
                )}
                {profileEmoji && (
                  <Button
                    variant="ghost-destructive"
                    size="sm"
                    onClick={() => handleEmojiChange("")}
                    disabled={savingEmoji}
                    className="h-7 text-xs"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* Training slots (athletes) */}
          {user.role === "athlete" && (
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Calendar className="h-4 w-4" />
                  Training schedule
                </h2>
                {user.groupId && (
                  <Button
                    variant="ghost-secondary"
                    size="sm"
                    className="h-8 shrink-0 gap-1.5"
                    onClick={handleSyncGroupSchedule}
                    disabled={syncingSchedule}
                    aria-label="Sync with group"
                  >
                    {syncingSchedule ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Sync with group
                  </Button>
                )}
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Set your weekly training schedule. Group schedule set by Coach
                cannot be modified. Streaks are based on logging within 24 hours
                of each scheduled slot.
              </p>
              <div className="flex flex-col gap-3">
                {trainingSlots.map((slot, index) => {
                  const isGroup = isGroupSlot(slot);
                  return (
                    <div
                      key={index}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/50 p-3"
                    >
                      <select
                        value={slot.dayOfWeek}
                        onChange={(e) =>
                          updateTrainingSlot(
                            index,
                            "dayOfWeek",
                            Number(e.target.value),
                          )
                        }
                        disabled={!!isGroup}
                        className="h-9 flex-1 min-w-[120px] rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {DAYS.map((name, i) => (
                          <option key={i} value={i}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={slot.time}
                        onChange={(e) =>
                          updateTrainingSlot(index, "time", e.target.value)
                        }
                        disabled={!!isGroup}
                        className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                      />
                      <Button
                        variant="ghost-secondary"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() =>
                          isGroup
                            ? setDeleteGroupSlotConfirmIndex(index)
                            : removeTrainingSlot(index)
                        }
                        aria-label={
                          isGroup ? "Remove group schedule slot" : "Remove slot"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                <Button
                  variant="ghost-secondary"
                  size="sm"
                  className="w-fit"
                  onClick={addTrainingSlot}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add schedule slot
                </Button>
              </div>
              <AlertDialog
                open={deleteGroupSlotConfirmIndex !== null}
                onOpenChange={(open) =>
                  !open && setDeleteGroupSlotConfirmIndex(null)
                }
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you sure you want to delete the group schedule?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove this group schedule slot. You can bring
                      it back anytime with Sync.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConfirmRemoveGroupSlot}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </section>
          )}

          {/* Celebration toggle (athletes only) */}
          {user.role === "athlete" && (
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <PartyPopper className="h-4 w-4" />
                Celebration
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Show a confetti celebration when you create a new log entry.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Show celebration on new log
                </span>
                <Switch
                  checked={celebrationEnabled}
                  onCheckedChange={(checked) => {
                    setCelebrationEnabled(checked);
                    try {
                      localStorage.setItem(CELEBRATION_KEY, String(checked));
                    } catch {
                      // ignore
                    }
                  }}
                />
              </div>
            </section>
          )}

          {/* Filter order (coach only) */}
          {user.role === "coach" && (
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <SlidersHorizontal className="h-4 w-4" />
                Filter Order
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Reorder the filter sections in your dashboard sidebar.
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleFilterDragEnd}
              >
                <SortableContext
                  items={filterOrder}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2">
                    {filterOrder.map((id) => (
                      <SortableFilterItem
                        key={id}
                        id={id}
                        label={FILTER_LABELS[id]}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          )}

          {/* Delete account section */}
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete Account
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </p>
            <AlertDialog
              open={deleteConfirmOpen}
              onOpenChange={setDeleteConfirmOpen}
            >
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete Account
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Are you sure you want to delete your account?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account, all your logs,
                    and any groups you coach. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </div>
      </main>
    </div>
  );
}
