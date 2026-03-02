"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Pencil, User } from "lucide-react";
import { format } from "date-fns";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { VisibilityBadge } from "@/components/dashboard/shared/visibility-badge";
import { TagPill } from "@/components/dashboard/shared/tag-pill";
import { CommentSection } from "./comment-section";
import { ReviewStatusBadge } from "./review-status-badge";
import type { LogEntry } from "@/types/dashboard";

export type { LogEntry };

interface LogCardProps {
  log: LogEntry;
  onDelete: (id: string) => void;
  onEdit: (log: LogEntry) => void;
  onClick: (log: LogEntry) => void;
  index: number;
  currentUserId: string;
  isCoach: boolean;
  groupId: string | null;
  onMutateLogs?: () => void;
}

export function LogCard({
  log,
  onDelete,
  onEdit,
  onClick,
  index,
  currentUserId,
  isCoach,
  groupId,
  onMutateLogs,
}: LogCardProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const formattedDate = format(new Date(log.timestamp), "MMM d, yyyy");
  const formattedTime = format(new Date(log.timestamp), "h:mm a");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{
        delay: index * 0.05,
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group cursor-pointer rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/20"
      onMouseOver={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(log);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        // Only handle if the event target is the card itself, not child inputs
        const target = e.target as HTMLElement;
        if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(log);
        }
      }}
    >
      <div className="flex items-start gap-4">
        {/* Emoji */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-3xl">
          {log.emoji}
        </div>

        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {formattedDate}
              </span>
              <span className="text-xs text-muted-foreground">
                {formattedTime}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isCoach && log.visibility === "coach" && (
                <ReviewStatusBadge
                  logId={log.id}
                  status={log.reviewStatus ?? "pending"}
                  onMutate={onMutateLogs}
                />
              )}
              {!isCoach && (
                <VisibilityBadge visibility={log.visibility} />
              )}
              {log.isOwn && (
                <div
                  className={`flex items-center gap-1 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"} ${
                    !isCoach ? "hidden lg:flex" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(log);
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary/50 hover:text-foreground"
                    aria-label="Edit log"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmOpen(true);
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete log"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <DeleteConfirmDialog
                    open={deleteConfirmOpen}
                    onOpenChange={setDeleteConfirmOpen}
                    description="This log entry will be permanently removed."
                    onConfirm={() => onDelete(log.id)}
                    stopPropagation
                  />
                </div>
              )}
            </div>
          </div>

          {/* Author (if viewing group log not your own) */}
          {!log.isOwn && (
            <div className="mt-1 flex items-center gap-1">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {log.userName}
              </span>
            </div>
          )}

          {/* Notes */}
          {log.notes && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {log.notes}
            </p>
          )}

          {/* Tags */}
          {log.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {log.tags.map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comment / Feedback Section - only for coach-shared logs */}
      {log.visibility === "coach" && (
        <CommentSection
          logId={log.id}
          isLogOwner={log.isOwn}
          isCoach={isCoach}
          currentUserId={currentUserId}
          groupId={groupId}
        />
      )}
    </motion.div>
  );
}
