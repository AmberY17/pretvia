"use client";

import React from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetcher } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
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
  const queryClient = useQueryClient();

  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContentHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const canParticipate = isLogOwner || isCoach;

  const commentsQueryKey = [...queryKeys.comments.byLog(logId), currentUserId, groupId ?? ""];

  const { data } = useQuery<{ comments: Comment[]; unreadCount: number }>({
    queryKey: commentsQueryKey,
    queryFn: () => apiFetcher(`/api/comments?logId=${logId}`),
    enabled: canParticipate,
  });

  const comments = data?.comments ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const invalidateComments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.comments.byLog(logId) });
  }, [queryClient, logId]);

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
        invalidateComments();
      } catch {
        toast.error("Network error");
      } finally {
        setSending(false);
      }
    },
    [logId, newComment, invalidateComments],
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
        invalidateComments();
      } catch {
        toast.error("Network error");
      } finally {
        setActionLoading(null);
      }
    },
    [editText, invalidateComments],
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
        invalidateComments();
      } catch {
        toast.error("Network error");
      } finally {
        setActionLoading(null);
      }
    },
    [invalidateComments],
  );

  const markAsRead = useCallback(async () => {
    try {
      await fetch("/api/comments/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId }),
      });
      invalidateComments();
    } catch {
      // Silently fail - this is not critical
    }
  }, [logId, invalidateComments]);

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
      <motion.div
        animate={{
          height: isExpanded ? contentHeight : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        initial={false}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        style={{ overflow: isExpanded ? "visible" : "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={contentRef}>
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
        </div>
      </motion.div>
    </div>
  );
}
