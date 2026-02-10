"use client"

import { motion } from "framer-motion"
import { Users, Lock, Trash2, Pencil, User } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { CommentSection } from "./comment-section"

export interface LogEntry {
  id: string
  emoji: string
  timestamp: string
  isGroup: boolean
  notes: string
  tags: string[]
  userId: string
  userName: string
  isOwn: boolean
  createdAt: string
}

interface LogCardProps {
  log: LogEntry
  onDelete: (id: string) => void
  onEdit: (log: LogEntry) => void
  onClick: (log: LogEntry) => void
  index: number
  currentUserId: string
  isCoach: boolean
}

export function LogCard({ log, onDelete, onEdit, onClick, index, currentUserId, isCoach }: LogCardProps) {
  const formattedDate = format(new Date(log.timestamp), "MMM d, yyyy")
  const formattedTime = format(new Date(log.timestamp), "h:mm a")

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
      onClick={() => onClick(log)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick(log)
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
              <Badge
                variant={log.isGroup ? "default" : "secondary"}
                className={`text-xs ${
                  log.isGroup
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-secondary text-muted-foreground border-border"
                }`}
              >
                {log.isGroup ? (
                  <Users className="mr-1 h-3 w-3" />
                ) : (
                  <Lock className="mr-1 h-3 w-3" />
                )}
                {log.isGroup ? "Group" : "Private"}
              </Badge>
              {log.isOwn && (
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(log)
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                    aria-label="Edit log"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(log.id)
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete log"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
                <span
                  key={tag}
                  className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comment / Feedback Section */}
      {log.isGroup && (
        <CommentSection
          logId={log.id}
          isLogOwner={log.isOwn}
          isCoach={isCoach}
          currentUserId={currentUserId}
        />
      )}
    </motion.div>
  )
}
