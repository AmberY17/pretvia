"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Trash2, Send, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/main/shared";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { Announcement } from "@/types/dashboard";

interface AnnouncementItemProps {
  announcement: Announcement;
  isCoach: boolean;
  currentUserId?: string;
  onMutate: () => void;
}

export function AnnouncementItem({
  announcement,
  isCoach,
  currentUserId,
  onMutate,
}: AnnouncementItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePatch = async () => {
    if (!editText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/announcements?id=${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update announcement");
        return;
      }
      setIsEditing(false);
      setEditText("");
      onMutate();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/announcements?id=${announcement.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to remove announcement");
        return;
      }
      setConfirmOpen(false);
      onMutate();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="group/announcement rounded-2xl border border-primary/20 bg-primary/5 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Megaphone className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="text-xs font-semibold text-primary">
                  Announcement
                </span>
                {announcement.scope === "club" ? (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Club
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    from {announcement.coachName}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(announcement.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
            {isCoach && announcement.coachId === currentUserId && !isEditing && (
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/announcement:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setEditText(announcement.text);
                  }}
                  disabled={loading}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                  aria-label="Edit announcement"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={loading}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remove announcement"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <DeleteConfirmDialog
                  open={confirmOpen}
                  onOpenChange={(open) => !open && setConfirmOpen(false)}
                  description="This announcement will be removed for all group members."
                  onConfirm={handleDelete}
                />
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="mt-3 space-y-3">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Write your announcement..."
                rows={2}
                maxLength={500}
                className="resize-none border-border bg-secondary text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {editText.length}/500
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost-secondary"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditText("");
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="ghost-primary"
                    size="sm"
                    disabled={loading || !editText.trim()}
                    onClick={handlePatch}
                    className="h-7 gap-1.5 text-xs"
                  >
                    {loading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              {announcement.text}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
