"use client";

import {
  Loader2,
  Shield,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export interface Comment {
  id: string;
  logId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorEmoji?: string | null;
  text: string;
  createdAt: string;
}

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editText: string;
  setEditText: (text: string) => void;
  actionLoading: string | null;
  onEdit: (commentId: string) => void;
  onDelete: (commentId: string) => void;
}

export function CommentItem({
  comment,
  currentUserId,
  editingId,
  setEditingId,
  editText,
  setEditText,
  actionLoading,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const isOwn = comment.authorId === currentUserId;
  const isCoachComment = comment.authorRole === "coach";
  const isEditing = editingId === comment.id;

  return (
    <div
      data-testid="comment-item"
      className={`group/comment flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
    >
      <Avatar className="h-7 w-7 shrink-0 shadow-sm">
        <AvatarFallback
          className={`font-semibold ${
            comment.authorEmoji ? "text-sm" : "text-[11px]"
          } ${
            isCoachComment
              ? "bg-primary/15 text-primary"
              : "bg-secondary text-foreground"
          }`}
        >
          {comment.authorEmoji ||
            comment.authorName?.charAt(0)?.toUpperCase() ||
            "?"}
        </AvatarFallback>
      </Avatar>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
          isOwn
            ? "bg-primary/10 text-foreground"
            : "bg-secondary/80 text-foreground"
        }`}
      >
        <div className="mb-1 flex items-center gap-1.5">
          <span className="text-xs font-semibold">{comment.authorName}</span>
          {isCoachComment && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
              <Shield className="h-2 w-2" />
              Coach
            </span>
          )}
          <span className="text-[11px] text-muted-foreground/70">
            {formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        {isEditing ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onEdit(comment.id);
                }
                if (e.key === "Escape") {
                  setEditingId(null);
                  setEditText("");
                }
              }}
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              autoFocus
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(comment.id)}
                disabled={actionLoading === comment.id || !editText.trim()}
                className="rounded-md p-1 text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                aria-label="Save edit"
              >
                {actionLoading === comment.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setEditText("");
                }}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary"
                aria-label="Cancel edit"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{comment.text}</p>
        )}
        {/* Edit/Delete actions (own comments only, not while editing) */}
        {isOwn && !isEditing && (
          <div className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/comment:opacity-100">
            <button
              type="button"
              onClick={() => {
                setEditingId(comment.id);
                setEditText(comment.text);
              }}
              disabled={actionLoading === comment.id}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
              aria-label="Edit comment"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              disabled={actionLoading === comment.id}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete comment"
            >
              {actionLoading === comment.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
