"use client"

import { motion } from "framer-motion"
import { Eye, Lock, X, Pencil, Trash2, User, Calendar, Clock } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { LogEntry } from "./log-card"

interface LogDetailProps {
  log: LogEntry
  onClose: () => void
  onEdit: (log: LogEntry) => void
  onDelete: (id: string) => void
  isCoach?: boolean
}

export function LogDetail({ log, onClose, onEdit, onDelete, isCoach }: LogDetailProps) {
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

        {/* Visibility Badge */}
        <div className="mt-4 flex justify-center">
          <Badge
            variant={log.visibility === "coach" ? "default" : "secondary"}
            className={`text-xs ${
              log.visibility === "coach"
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-secondary text-muted-foreground border-border"
            }`}
          >
            {log.visibility === "coach" ? (
              <Eye className="mr-1.5 h-3 w-3" />
            ) : (
              <Lock className="mr-1.5 h-3 w-3" />
            )}
            {log.visibility === "coach" ? "Shared with coach" : "Private"}
          </Badge>
        </div>

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
                <span
                  key={tag}
                  className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions (only for own logs, not for coaches viewing) */}
      {log.isOwn && !isCoach && (
        <div className="flex gap-2 border-t border-border pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(log)}
            className="flex-1 gap-2 border-border bg-transparent text-foreground hover:bg-secondary"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(log.id)}
            className="gap-2 border-border bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      )}
    </motion.div>
  )
}
