"use client";

import React from "react";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { urlFetcher } from "@/lib/swr-utils";
import {
  MessageCircle,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CommentItem } from "./comment-item";
import type { Comment } from "./comment-item";

interface CommentSectionProps {
  logId: string;
  isLogOwner: boolean;
  isCoach: boolean;
  currentUserId: string;
  groupId: string | null;
}

export function CommentSection({
  logId,
  isLogOwner,
  isCoach,
  currentUserId,
  groupId,
}: CommentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canParticipate = isLogOwner || isCoach;

  const { data, mutate } = useSWR<{ comments: Comment[]; unreadCount: number }>(
    canParticipate
      ? [`/api/comments?logId=${logId}`, currentUserId, groupId ?? ""]
      : null,
    urlFetcher,
  );

  const comments = data?.comments ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;

      setSending(true);
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logId, text: newComment.trim() }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to post comment");
          return;
        }
        setNewComment("");
        mutate();
      } catch {
        toast.error("Network error");
      } finally {
        setSending(false);
      }
    },
    [logId, newComment, mutate],
  );

  const handleEdit = useCallback(
    async (commentId: string) => {
      if (!editText.trim()) return;
      setActionLoading(commentId);
      try {
        const res = await fetch("/api/comments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: commentId, text: editText.trim() }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to edit comment");
          return;
        }
        setEditingId(null);
        setEditText("");
        mutate();
      } catch {
        toast.error("Network error");
      } finally {
        setActionLoading(null);
      }
    },
    [editText, mutate],
  );

  const handleDelete = useCallback(
    async (commentId: string) => {
      setActionLoading(commentId);
      try {
        const res = await fetch(`/api/comments?id=${commentId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          toast.error("Failed to delete comment");
          return;
        }
        mutate();
      } catch {
        toast.error("Network error");
      } finally {
        setActionLoading(null);
      }
    },
    [mutate],
  );

  const markAsRead = useCallback(async () => {
    try {
      await fetch("/api/comments/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId }),
      });
      mutate();
    } catch {
      // Silently fail - this is not critical
    }
  }, [logId, mutate]);

  if (!canParticipate) return null;

  const commentCount = comments.length;
  const hasUnread = unreadCount > 0;

  return (
    <div className="mt-4 border-t border-border/50 pt-3">
      {/* Toggle button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const willExpand = !isExpanded;
          setIsExpanded(willExpand);
          if (willExpand && hasUnread) {
            markAsRead();
          }
        }}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
      >
        <MessageCircle className={`h-3.5 w-3.5 ${hasUnread ? "text-checkin" : ""}`} />
        <span className="font-medium">
          {isExpanded
            ? "Hide feedback"
            : hasUnread
              ? `${unreadCount} new ${unreadCount === 1 ? "comment" : "comments"}`
              : commentCount > 0
                ? `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`
                : "Feedback"}
        </span>
        {isExpanded ? (
          <ChevronUp className="ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="ml-auto h-3.5 w-3.5" />
        )}
      </button>

      {/* Expanded comment thread */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: isExpanded ? "visible" : "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-3 pt-3">
              {/* Comments list */}
              {comments.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUserId}
                      editingId={editingId}
                      setEditingId={setEditingId}
                      editText={editText}
                      setEditText={setEditText}
                      actionLoading={actionLoading}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 py-3">
                  <MessageCircle className="h-4 w-4 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground/60">
                    No feedback yet. Start the conversation.
                  </p>
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                className="flex items-end gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder={
                      isCoach ? "Leave feedback..." : "Reply to coach..."
                    }
                    rows={1}
                    maxLength={1000}
                    className="w-full resize-none rounded-xl border border-primary/20 bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={sending || !newComment.trim()}
                  className="h-[38px] w-[38px] shrink-0 rounded-xl bg-primary p-0 text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-40 place-self-center"
                  aria-label="Send comment"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
