"use client"

import React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Megaphone, X, Send, Loader2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface Announcement {
  id: string
  text: string
  coachName: string
  createdAt: string
}

interface AnnouncementBannerProps {
  announcement: Announcement | null
  isCoach: boolean
  onMutate: () => void
}

export function AnnouncementBanner({
  announcement,
  isCoach,
  onMutate,
}: AnnouncementBannerProps) {
  const [isComposing, setIsComposing] = useState(false)
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)

  const handlePost = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to post announcement")
        return
      }
      toast.success("Announcement posted")
      setText("")
      setIsComposing(false)
      onMutate()
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/announcements", { method: "DELETE" })
      if (!res.ok) {
        toast.error("Failed to remove announcement")
        return
      }
      toast.success("Announcement removed")
      onMutate()
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-3">
      {/* Active announcement */}
      <AnimatePresence>
        {announcement && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative rounded-2xl border border-primary/20 bg-primary/5 p-4"
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
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={loading}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Remove announcement"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
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
                variant="outline"
                size="sm"
                onClick={() => setIsComposing(true)}
                className="w-full gap-2 border-dashed border-border bg-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground"
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
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsComposing(false)
                      setText("")
                    }}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={loading || !text.trim()}
                    onClick={handlePost}
                    className="h-7 gap-1.5 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
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
  )
}
