"use client";

import React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Trash2, Send, Loader2, Shield, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  announcement: Announcement | null;
  isCoach: boolean;
  onMutate: () => void;
}

export function AnnouncementBanner({
  announcement,
  isCoach,
  onMutate,
}: AnnouncementBannerProps) {
  const [isComposing, setIsComposing] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

  const handleDismiss = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/announcements", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to remove announcement");
        return;
      }
      onMutate();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-3">
      {/* Active announcement */}
      <AnimatePresence>
        {announcement && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="group/announcement relative rounded-2xl border border-primary/20 bg-primary/5 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Megaphone className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
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
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {announcement.text}
                </p>
              </div>
              {isCoach && (
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/announcement:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setText(announcement.text);
                      setIsComposing(true);
                    }}
                    disabled={loading}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                    aria-label="Edit announcement"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <AlertDialog
                    open={deleteConfirmOpen}
                    onOpenChange={setDeleteConfirmOpen}
                  >
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={loading}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove announcement"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you sure you want to delete?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This announcement will be removed for all group
                          members.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDismiss}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </motion.div>
        )}
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
                {announcement ? "Update Announcement" : "Post Announcement"}
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
                  {announcement && text === announcement.text
                    ? "Edit Announcement"
                    : "New Announcement"}
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
