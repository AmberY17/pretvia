"use client"

import { useState } from "react"
import { ArrowRightLeft, Users, Check, ChevronDown } from "lucide-react"
import { toast } from "sonner"

type UserGroup = { id: string; name: string; code: string; headCoachId: string }

interface GroupSwitcherProps {
  userGroups: UserGroup[]
  currentGroupId?: string
  onGroupChanged: (newGroupId: string) => void
}

export function GroupSwitcher({ userGroups, currentGroupId, onGroupChanged }: GroupSwitcherProps) {
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [groupSearch, setGroupSearch] = useState("")
  const [loading, setLoading] = useState(false)

  const filteredGroups = groupSearch.trim()
    ? userGroups.filter((g) => g.name.toLowerCase().includes(groupSearch.trim().toLowerCase()))
    : userGroups

  const handleSwitch = async (groupId: string) => {
    setLoading(true)
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", groupId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to switch group")
        return
      }

      setShowSwitcher(false)
      setGroupSearch("")
      onGroupChanged(groupId)
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setShowSwitcher((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <ArrowRightLeft className="h-3 w-3" />
          Switch Group
          {userGroups.length > 0 && (
            <span className="text-muted-foreground/80">({userGroups.length})</span>
          )}
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${showSwitcher ? "rotate-180" : ""}`}
        />
      </button>
      {showSwitcher && (
        <div className="mt-1.5 flex flex-col gap-1 rounded-lg border border-border bg-card p-1">
          {userGroups.length >= 5 && (
            <input
              type="text"
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              placeholder="Search groups..."
              className="mx-1 mb-0.5 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          )}
          {filteredGroups.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">No groups match</p>
          ) : (
            <div
              className={`flex flex-col gap-1 ${
                filteredGroups.length > 5
                  ? "max-h-36 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  : ""
              }`}
            >
              {filteredGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleSwitch(g.id)}
                  disabled={loading || g.id === currentGroupId}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    g.id === currentGroupId
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <Users className="h-3 w-3" />
                  <span className="flex-1 text-left truncate">{g.name}</span>
                  {g.id === currentGroupId && <Check className="h-3 w-3 shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
