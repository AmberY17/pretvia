"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardCheck, Plus, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiMutate } from "@/lib/query-client";
import { getNextPracticeFromSchedule } from "@/lib/next-practice-from-schedule";
import { DateTimeWheelPicker } from "@/components/main/dashboard/shared";
import type { TrainingSlot } from "@/types/dashboard";

function toLocalDatetime(isoString?: string) {
  const d = isoString ? new Date(isoString) : new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

interface CheckinComposerProps {
  onMutate: () => void;
  trainingScheduleTemplate?: TrainingSlot[];
}

export function CheckinComposer({
  onMutate,
  trainingScheduleTemplate,
}: CheckinComposerProps) {
  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [sessionDate, setSessionDate] = useState(toLocalDatetime());
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await apiMutate("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionDate: new Date(sessionDate).toISOString(),
          title: title.trim() || null,
        }),
      });
      setTitle("");
      setSessionDate(toLocalDatetime());
      setIsComposing(false);
      onMutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create check-in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!isComposing ? (
        <motion.div
          key="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Button
            variant="ghost-primary"
            size="sm"
            onClick={() => {
              if (trainingScheduleTemplate && trainingScheduleTemplate.length > 0) {
                const next = getNextPracticeFromSchedule(trainingScheduleTemplate);
                setSessionDate(toLocalDatetime(next ? next.toISOString() : undefined));
              } else {
                setSessionDate(toLocalDatetime());
              }
              setIsComposing(true);
            }}
            className="w-full gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Session Check-In
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              New Session Check-In
            </span>
          </div>

          <div className="mb-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="checkin-title"
                className="text-xs text-muted-foreground"
              >
                Title (optional)
              </Label>
              <Input
                id="checkin-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Morning Session"
                maxLength={100}
                className="h-8 border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="checkin-date"
                className="text-xs text-muted-foreground"
              >
                Session Date & Time
              </Label>
              <DateTimeWheelPicker
                value={sessionDate}
                onChange={setSessionDate}
                className="h-8 py-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost-secondary"
              size="sm"
              onClick={() => {
                setIsComposing(false);
                setTitle("");
                setSessionDate(toLocalDatetime());
              }}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost-primary"
              size="sm"
              disabled={loading}
              onClick={handleCreate}
              className="h-7 gap-1.5 text-xs"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Create
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
