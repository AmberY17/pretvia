"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Trash2, Send, Loader2, Shield, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Announcement {
  id: string;
  text: string;
  coachName: string;
  createdAt: string;
}

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
  const [isComposing, setIsComposing] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handlePost = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to post announcement");
        return;
      }
      setText("");
      setIsComposing(false);
      onMutate();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handlePatch = async (id: string) => {
    if (!editingText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/announcements?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editingText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update announcement");
        return;
      }
      setEditingId(null);
      setEditingText("");
      onMutate();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/announcements?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to remove announcement");
        return;
      }
      setDeleteConfirmId(null);
      onMutate();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-3">
      {/* Announcement cards */}
      <AnimatePresence>
        {announcements.map((announcement) => (
          <motion.div
            key={announcement.id}
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
                      <span className="text-xs text-muted-foreground">
                        from {announcement.coachName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(announcement.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  {isCoach && editingId !== announcement.id && (
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/announcement:opacity-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(announcement.id);
                          setEditingText(announcement.text);
                        }}
                        disabled={loading}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                        aria-label="Edit announcement"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(announcement.id)}
                        disabled={loading}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Remove announcement"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <DeleteConfirmDialog
                        open={deleteConfirmId === announcement.id}
                        onOpenChange={(open) =>
                          !open && setDeleteConfirmId(null)
                        }
                        description="This announcement will be removed for all group members."
                        onConfirm={() => handleDelete(announcement.id)}
                      />
                    </div>
                  )}
                </div>
                {editingId === announcement.id ? (
                  <div className="mt-3 space-y-3">
                    <Textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      placeholder="Write your announcement..."
                      rows={2}
                      maxLength={500}
                      className="resize-none border-border bg-secondary text-foreground placeholder:text-muted-foreground"
                      autoFocus
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {editingText.length}/500
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost-secondary"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditingText("");
                          }}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="ghost-primary"
                          size="sm"
                          disabled={loading || !editingText.trim()}
                          onClick={() => handlePatch(announcement.id)}
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
        ))}
      </AnimatePresence>

      {/* Coach compose button / form */}
      {isCoach && (
        <AnimatePresence mode="wait">
          {!isComposing ? (
            <motion.div
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                variant="ghost-primary"
                size="sm"
                onClick={() => setIsComposing(true)}
                className="w-full gap-2"
              >
                <Megaphone className="h-3.5 w-3.5" />
                New Announcement
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  New Announcement
                </span>
                <span className="text-xs text-muted-foreground">
                  Visible to all group members
                </span>
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your announcement..."
                rows={2}
                maxLength={500}
                className="mb-3 resize-none border-border bg-secondary text-foreground placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {text.length}/500
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost-secondary"
                    size="sm"
                    onClick={() => {
                      setIsComposing(false);
                      setText("");
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="ghost-primary"
                    size="sm"
                    disabled={loading || !text.trim()}
                    onClick={handlePost}
                    className="h-7 gap-1.5 text-xs"
                  >
                    {loading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    Post
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
