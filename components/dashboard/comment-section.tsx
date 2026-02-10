"use client"

import React from "react"
import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import useSWR from "swr"
import {
  MessageCircle,
  Send,
  Loader2,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface Comment {
  id: string
  logId: string
  authorId: string
  authorName: string
  authorRole: string
  text: string
  createdAt: string
}

interface CommentSectionProps {
  logId: string
  isLogOwner: boolean
  isCoach: boolean
  currentUserId: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function CommentSection({
  logId,
  isLogOwner,
  isCoach,
  currentUserId,
}: CommentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [sending, setSending] = useState(false)

  const canParticipate = isLogOwner || isCoach

  const { data, mutate } = useSWR<{ comments: Comment[] }>(
    canParticipate && isExpanded ? `/api/comments?logId=${logId}` : null,
    fetcher
  )

  const comments = data?.comments ?? []

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newComment.trim()) return

      setSending(true)
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logId, text: newComment.trim() }),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error || "Failed to post comment")
          return
        }
        setNewComment("")
        mutate()
      } catch {
        toast.error("Network error")
      } finally {
        setSending(false)
      }
    },
    [logId, newComment, mutate]
  )

  // Don't show comment section if user can't participate
  if (!canParticipate) return null

  const commentCount = comments.length

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* Toggle button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsExpanded((prev) => !prev)
        }}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        <span>
          {isExpanded
            ? "Hide feedback"
            : commentCount > 0
              ? `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`
              : "Feedback"}
        </span>
        {isExpanded ? (
          <ChevronUp className="ml-auto h-3 w-3" />
        ) : (
          <ChevronDown className="ml-auto h-3 w-3" />
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
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-3 pt-3">
              {/* Comments list */}
              {comments.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {comments.map((comment) => {
                    const isOwn = comment.authorId === currentUserId
                    return (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
                      >
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback
                            className={`text-xs ${
                              comment.authorRole === "coach"
                                ? "bg-primary/10 text-primary"
                                : "bg-secondary text-foreground"
                            }`}
                          >
                            {comment.authorName?.charAt(0)?.toUpperCase() ||
                              "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-2 ${
                            isOwn
                              ? "bg-primary/10 text-foreground"
                              : "bg-secondary text-foreground"
                          }`}
                        >
                          <div className="mb-0.5 flex items-center gap-1.5">
                            <span className="text-xs font-medium">
                              {comment.authorName}
                            </span>
                            {comment.authorRole === "coach" && (
                              <Shield className="h-2.5 w-2.5 text-primary" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(comment.createdAt),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">
                            {comment.text}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <p className="px-2 text-xs text-muted-foreground">
                  No feedback yet. Start the conversation.
                </p>
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
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(e)
                      }
                    }}
                    placeholder={
                      isCoach ? "Leave feedback..." : "Reply to coach..."
                    }
                    rows={1}
                    maxLength={1000}
                    className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={sending || !newComment.trim()}
                  className="h-9 w-9 shrink-0 bg-primary p-0 text-primary-foreground hover:bg-primary/90"
                  aria-label="Send comment"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
