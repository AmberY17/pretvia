"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Pencil, Trash2, User, Calendar, Clock } from "lucide-react"
import { format } from "date-fns"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { VisibilityBadge } from "@/components/dashboard/shared/visibility-badge"
import { TagPill } from "@/components/dashboard/shared/tag-pill"
import type { LogEntry } from "@/types/dashboard"
import { ReviewStatusBadge } from "./review-status-badge"

interface LogDetailProps {
  log: LogEntry
  onClose: () => void
  onEdit: (log: LogEntry) => void
  onDelete: (id: string) => void
  isCoach?: boolean
  onMutateLogs?: () => void
}

export function LogDetail({ log, onClose, onEdit, onDelete, isCoach, onMutateLogs }: LogDetailProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [localReviewStatus, setLocalReviewStatus] = useState<"pending" | "reviewed" | "revisit">(log.reviewStatus ?? "pending")
  useEffect(() => {
    setLocalReviewStatus(log.reviewStatus ?? "pending")
  }, [log.id, log.reviewStatus])

  // Auto-set to reviewed when coach opens a log that is not already reviewed
  useEffect(() => {
    if (
      !isCoach ||
      log.visibility !== "coach" ||
      (log.reviewStatus ?? "pending") === "reviewed"
    ) {
      return
    }
    const run = async () => {
      try {
        const res = await fetch(`/api/logs/${log.id}/review`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "reviewed" }),
        })
        if (res.ok) {
          setLocalReviewStatus("reviewed")
          onMutateLogs?.()
        }
      } catch {
        // Ignore
      }
    }
    run()
  }, [log.id, log.visibility, log.reviewStatus, isCoach, onMutateLogs])
  const formattedDate = format(new Date(log.timestamp), "EEEE, MMMM d, yyyy")
  const formattedTime = format(new Date(log.timestamp), "h:mm a")

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h3 className="text-lg font-semibold text-foreground">Log Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-6">
        {/* Big Emoji */}
        <div className="flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-secondary text-5xl">
            {log.emoji}
          </div>
        </div>

        {/* Date & Time */}
        <div className="mt-6 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-foreground">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{formattedTime}</span>
          </div>
        </div>

        {/* Review status badge (coach only) */}
        {isCoach && log.visibility === "coach" && (
          <div className="mt-4 flex justify-center">
            <ReviewStatusBadge
              logId={log.id}
              status={localReviewStatus}
              onChange={setLocalReviewStatus}
              onMutate={onMutateLogs}
            />
          </div>
        )}
        {/* Visibility Badge (hidden for coaches - they only see shared logs) */}
        {!isCoach && (
          <div className="mt-4 flex justify-center">
            <VisibilityBadge visibility={log.visibility} />
          </div>
        )}

        {/* Author */}
        {!log.isOwn && (
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              by {log.userName}
            </span>
          </div>
        )}

        {/* Notes */}
        {log.notes && (
          <div className="mt-6">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {log.notes}
            </p>
          </div>
        )}

        {/* Tags */}
        {log.tags.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {log.tags.map((tag) => (
                <TagPill key={tag} tag={tag} size="md" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions (only for own logs, not for coaches viewing) */}
      {log.isOwn && !isCoach && (
        <div className="flex gap-2 border-t border-border pt-4">
          <Button
            variant="ghost-primary"
            size="sm"
            onClick={() => onEdit(log)}
            className="flex-1 gap-2"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost-destructive"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            className="gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <DeleteConfirmDialog
            open={deleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
            description="This log entry will be permanently removed."
            onConfirm={() => onDelete(log.id)}
          />
        </div>
      )}
    </motion.div>
  )
}
