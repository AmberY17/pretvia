"use client"

import { motion } from "framer-motion"
import { ClipboardCheck, X, Calendar, Clock } from "lucide-react"
import { format } from "date-fns"

interface SessionItem {
  id: string
  title: string | null
  sessionDate: string
  checkedInCount: number
  totalAthletes: number
}

interface SessionFilterProps {
  sessions: SessionItem[]
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  onClear: () => void
  hideHeader?: boolean
}

export function SessionFilter({
  sessions,
  activeSessionId,
  onSelect,
  onClear,
  hideHeader = false,
}: SessionFilterProps) {
  const content = sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sessions created yet.
        </p>
      ) : (
        <div
          className={`flex flex-col gap-2 ${
            sessions.length > 5
              ? "max-h-56 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              : ""
          }`}
        >
          {sessions.map((session) => {
            const isActive = activeSessionId === session.id
            const dateObj = new Date(session.sessionDate)
            return (
              <motion.button
                key={session.id}
                type="button"
                onClick={() => onSelect(session.id)}
                whileTap={{ scale: 0.98 }}
                className={`flex flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "bg-secondary/50 hover:bg-secondary"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
                    {session.title || "Session"}
                  </span>
                  {isActive && <X className="h-3 w-3 text-primary" />}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5" />
                    {format(dateObj, "MMM d")}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {format(dateObj, "h:mm a")}
                  </span>
                  <span className="ml-auto text-[11px]">
                    {session.checkedInCount}/{session.totalAthletes}
                  </span>
                </div>
              </motion.button>
            )
          })}
        </div>
      );

  if (hideHeader) {
    return <div className="min-w-0">{content}</div>
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Training Sessions
          </h3>
        </div>
        {activeSessionId && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
      {content}
    </div>
  )
}
