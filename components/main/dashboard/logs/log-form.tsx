"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Eye, Lock, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";
const EmojiPicker = dynamic(
  () => import("@/components/main/shared/emoji-picker").then((m) => m.EmojiPicker),
  { ssr: false }
);
import { TagInput } from "@/components/main/dashboard/logs/tag-input";
import { DateTimeWheelPicker } from "@/components/main/dashboard/shared/datetime-wheel-picker";
import { toast } from "sonner";
import type { LogEntry } from "./log-card";

interface LogFormProps {
  onLogCreated: (totalCount?: number) => void;
  onLogUpdated?: () => void;
  onClose?: () => void;
  onEditLog?: (logId: string) => void;
  editLog?: LogEntry | null;
  existingTags?: string[];
  prefillTimestamp?: string | null;
  checkinId?: string | null;
  activeGroupId?: string | null;
}

function getLocalTimestamp() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toLocalTimestamp(isoString: string) {
  const d = new Date(isoString);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function LogForm({
  onLogCreated,
  onLogUpdated,
  onClose,
  onEditLog,
  editLog,
  existingTags = [],
  prefillTimestamp,
  checkinId,
  activeGroupId,
}: LogFormProps) {
  const isEditing = Boolean(editLog);

  const [emoji, setEmoji] = useState(editLog?.emoji || "");
  const [timestamp, setTimestamp] = useState(
    editLog
      ? toLocalTimestamp(editLog.timestamp)
      : prefillTimestamp
        ? toLocalTimestamp(prefillTimestamp)
        : getLocalTimestamp(),
  );
  const [visibility, setVisibility] = useState<"coach" | "private">(
    editLog?.visibility || "coach",
  );
  const [notes, setNotes] = useState(editLog?.notes || "");
  const [tags, setTags] = useState<string[]>(editLog?.tags || []);
  const [loading, setLoading] = useState(false);
  const [todaySharedLogId, setTodaySharedLogId] = useState<string | null>(null);
  const [todayPrivateLogId, setTodayPrivateLogId] = useState<string | null>(null);
  const [todayLoading, setTodayLoading] = useState(!isEditing && !checkinId);

  // Sync fields when editLog changes
  useEffect(() => {
    if (editLog) {
      setEmoji(editLog.emoji);
      setTimestamp(toLocalTimestamp(editLog.timestamp));
      setVisibility(editLog.visibility || "coach");
      setNotes(editLog.notes);
      setTags(editLog.tags);
    } else {
      setEmoji("");
      setTimestamp(
        prefillTimestamp
          ? toLocalTimestamp(prefillTimestamp)
          : getLocalTimestamp(),
      );
      setVisibility("coach");
      setNotes("");
      setTags([]);
    }
  }, [editLog, prefillTimestamp, checkinId]);

  // Fetch today's log limits when in "new" mode without a checkin
  useEffect(() => {
    if (isEditing || checkinId) {
      setTodaySharedLogId(null);
      setTodayPrivateLogId(null);
      setTodayLoading(false);
      return;
    }
    setTodayLoading(true);
    let cancelled = false;
    const todayUrl = activeGroupId
      ? `/api/logs/today?groupId=${activeGroupId}`
      : "/api/logs/today";
    fetch(todayUrl)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setTodaySharedLogId(data.sharedLogId ?? null);
        setTodayPrivateLogId(data.privateLogId ?? null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTodayLoading(false); });
    return () => { cancelled = true; };
  }, [isEditing, checkinId, activeGroupId]);

  const resetForm = useCallback(() => {
    setEmoji("");
    setNotes("");
    setTags([]);
    setVisibility("coach");
    setTimestamp(getLocalTimestamp());
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!emoji) {
        toast.error("Please select an emoji for your log");
        return;
      }

      setLoading(true);
      try {
        if (isEditing && editLog) {
          // PUT to update
          const res = await fetch("/api/logs", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editLog.id,
              emoji,
              timestamp: new Date(timestamp).toISOString(),
              visibility,
              notes,
              tags,
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            toast.error(data.error || "Failed to update log");
            return;
          }
          onLogUpdated?.();
        } else {
          // POST to create
          const res = await fetch("/api/logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              emoji,
              timestamp: new Date(timestamp).toISOString(),
              visibility,
              notes,
              tags,
              ...(checkinId ? { checkinId } : {}),
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            toast.error(data.error || "Failed to create log");
            return;
          }
          const data = await res.json();
          resetForm();
          onLogCreated(data.totalCount);
        }
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [
      emoji,
      timestamp,
      visibility,
      notes,
      tags,
      checkinId,
      onLogCreated,
      onLogUpdated,
      isEditing,
      editLog,
      resetForm,
    ],
  );

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {isEditing ? "Edit Log" : "New Log Entry"}
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {todayLoading ? null : (<>

      {/* Emoji Picker */}
      {!((!isEditing && !checkinId) && todaySharedLogId && todayPrivateLogId) && (
        <div className="flex flex-col gap-2">
          <Label className="text-foreground">Activity</Label>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </div>
      )}

      {/* DateTime */}
      {!((!isEditing && !checkinId) && todaySharedLogId && todayPrivateLogId) && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="timestamp" className="text-foreground">
            Date & Time
          </Label>
          <DateTimeWheelPicker
            value={timestamp}
            onChange={setTimestamp}
          />
        </div>
      )}

      {/* Visibility Selector */}
      {!isEditing && !checkinId && todaySharedLogId && todayPrivateLogId ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/30 p-4">
          <p className="text-sm font-medium text-foreground">You&apos;ve already logged today.</p>
          <div className="flex gap-2">
            {onEditLog && (
              <>
                <Button
                  type="button"
                  variant="ghost-primary"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => onEditLog(todaySharedLogId)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Shared Log
                </Button>
                <Button
                  type="button"
                  variant="ghost-primary"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => onEditLog(todayPrivateLogId)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Private Log
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label className="text-foreground">Visibility</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisibility("coach")}
              disabled={!isEditing && !checkinId && !!todaySharedLogId}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                visibility === "coach"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>Shared</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility("private")}
              disabled={!isEditing && !checkinId && !!todayPrivateLogId}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                visibility === "private"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Lock className="h-4 w-4" />
              <span>Only me</span>
            </button>
          </div>
          {!isEditing && !checkinId && (todaySharedLogId || todayPrivateLogId) && (
            <div className="flex flex-col gap-0.5">
              {todaySharedLogId && (
                <p className="text-xs text-muted-foreground">
                  Shared already logged.{" "}
                  {onEditLog && (
                    <button
                      type="button"
                      onClick={() => onEditLog(todaySharedLogId)}
                      className="underline hover:text-foreground"
                    >
                      Edit
                    </button>
                  )}
                </p>
              )}
              {todayPrivateLogId && (
                <p className="text-xs text-muted-foreground">
                  Private already logged.{" "}
                  {onEditLog && (
                    <button
                      type="button"
                      onClick={() => onEditLog(todayPrivateLogId)}
                      className="underline hover:text-foreground"
                    >
                      Edit
                    </button>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!((!isEditing && !checkinId) && todaySharedLogId && todayPrivateLogId) && (
        <>
          {/* Notes */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes" className="text-foreground">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How was your session?"
              rows={3}
              className="resize-y border-border bg-secondary text-foreground placeholder:text-muted-foreground scrollbar-hidden"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Tags</Label>
            <TagInput tags={tags} onChange={setTags} suggestions={existingTags} />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="ghost-primary"
            disabled={loading || !emoji}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEditing ? (
              "Update Log"
            ) : (
              "Save Log Entry"
            )}
          </Button>
        </>
      )}

      </>)}
    </motion.form>
  );
}
