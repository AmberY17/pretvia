"use client"

import { useState, useCallback, useRef } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const AGE_GROUPS = ["U8", "U10", "U12", "U14", "U16", "U18", "Adult"]
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Elite"]

interface GroupData {
  ageGroups: string[]
  level: string
}

interface ActiveEggs {
  superEarlyAccess: boolean
  clickFrenzy: boolean
}

function GroupSection({
  index,
  data,
  onChange,
}: {
  index: number
  data: GroupData
  onChange: (data: GroupData) => void
}) {
  const optional = index === 1
  const label = `Group ${index + 1}${optional ? " (optional)" : ""}`

  function toggleAgeGroup(ag: string) {
    const next = data.ageGroups.includes(ag)
      ? data.ageGroups.filter((g) => g !== ag)
      : [...data.ageGroups, ag]
    onChange({ ...data, ageGroups: next })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/40 p-4">
      <p className="text-sm font-medium text-foreground">{label}</p>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Age groups</Label>
        <div className="flex flex-wrap gap-2">
          {AGE_GROUPS.map((ag) => {
            const selected = data.ageGroups.includes(ag)
            return (
              <button
                key={ag}
                type="button"
                onClick={() => toggleAgeGroup(ag)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                {ag}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`wl-level-${index}`} className="text-xs text-muted-foreground">
          Level
        </Label>
        <select
          id={`wl-level-${index}`}
          value={data.level}
          onChange={(e) => onChange({ ...data, level: e.target.value })}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select level…</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function WaitlistForm({ activeEggs }: { activeEggs: ActiveEggs }) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [clubName, setClubName] = useState("")
  const [groups, setGroups] = useState<GroupData[]>([
    { ageGroups: [], level: "" },
    { ageGroups: [], level: "" },
  ])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showSecretInput, setShowSecretInput] = useState(false)
  const [secretValue, setSecretValue] = useState("")
  const [superMode, setSuperMode] = useState(false)

  const [frenzyPhase, setFrenzyPhase] = useState<"idle" | "active" | "done">("idle")
  const [frenzyCount, setFrenzyCount] = useState(0)
  const [frenzyCountdown, setFrenzyCountdown] = useState(3)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function updateGroup(index: number, data: GroupData) {
    setGroups((prev) => prev.map((g, i) => (i === index ? data : g)))
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (frenzyPhase === "active") return

      const group1 = groups[0]
      if (group1.ageGroups.length === 0) {
        toast.error("Please select at least one age group for Group 1.")
        return
      }

      const submittedGroups = groups.filter((g) => g.ageGroups.length > 0)

      setLoading(true)
      try {
        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            clubName: clubName.trim(),
            groups: submittedGroups,
            superEarlyAccess: superMode,
            clickFrenzyCount: frenzyPhase === "done" ? frenzyCount : 0,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || "Something went wrong")
          return
        }
        setSubmitted(true)
      } catch {
        toast.error("Network error. Please try again.")
      } finally {
        setLoading(false)
      }
    },
    [firstName, lastName, email, clubName, groups, superMode, frenzyPhase, frenzyCount],
  )

  function handleButtonClick(e: React.MouseEvent) {
    if (!activeEggs.clickFrenzy || frenzyPhase === "done") return

    e.preventDefault()

    if (frenzyPhase === "idle") {
      setFrenzyPhase("active")
      setFrenzyCount(1)
      setFrenzyCountdown(3)
      setTimeout(() => {
        setFrenzyPhase("done")
        if (countdownRef.current) clearInterval(countdownRef.current)
      }, 3000)
      countdownRef.current = setInterval(() => {
        setFrenzyCountdown((c) => Math.max(0, c - 1))
      }, 1000)
    } else if (frenzyPhase === "active") {
      setFrenzyCount((c) => c + 1)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mb-4 text-4xl">🎉</div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">You&apos;re on the list!</h2>
        <p className="text-muted-foreground">
          We&apos;ll review your application and send you an invite link when your spot is approved.
          Keep an eye on your inbox.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="wl-first-name" className="text-foreground">
            First name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wl-first-name"
            type="text"
            placeholder="Amber"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            minLength={1}
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="wl-last-name" className="text-foreground">
            Last name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wl-last-name"
            type="text"
            placeholder="Yang"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            minLength={1}
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="wl-email" className="text-foreground">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="wl-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="wl-club" className="text-foreground">
          Club name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="wl-club"
          type="text"
          placeholder="Raffine Kim's Fencing Club"
          value={clubName}
          onChange={(e) => setClubName(e.target.value)}
          required
          minLength={1}
          className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          During the beta, each club can create up to 2 groups.
        </p>
        <GroupSection index={0} data={groups[0]} onChange={(d) => updateGroup(0, d)} />
        <GroupSection index={1} data={groups[1]} onChange={(d) => updateGroup(1, d)} />
      </div>

      <Button
        type="submit"
        disabled={loading}
        onClick={handleButtonClick}
        className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : frenzyPhase === "active" ? (
          `🔥 ${frenzyCount} — keep going!`
        ) : (
          <span className="flex items-center justify-center gap-0">
            <span>Request</span>

            {activeEggs.superEarlyAccess ? (
              superMode ? (
                <span>&nbsp;super&nbsp;</span>
              ) : showSecretInput ? (
                <input
                  autoFocus
                  type="text"
                  value={secretValue}
                  onChange={(e) => {
                    setSecretValue(e.target.value)
                    if (e.target.value.toLowerCase() === "super") {
                      setSuperMode(true)
                      setShowSecretInput(false)
                    }
                  }}
                  onBlur={() => {
                    setShowSecretInput(false)
                    setSecretValue("")
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="w-10 bg-transparent border-none outline-none text-center placeholder:text-primary-foreground/50"
                  placeholder="···"
                />
              ) : (
                <span
                  className="px-1 cursor-text"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowSecretInput(true)
                  }}
                >
                  &nbsp;
                </span>
              )
            ) : (
              <span>&nbsp;</span>
            )}

            <span>early access</span>
          </span>
        )}
      </Button>

      {frenzyPhase === "active" && (
        <p className="text-center text-xs text-muted-foreground mt-1">{frenzyCountdown}s</p>
      )}

      {(frenzyPhase === "done" || (frenzyPhase === "active" && frenzyCount >= 20)) && (
        <p className="text-center text-xs text-muted-foreground mt-1">
          🏆 {frenzyCount} clicks
          <br />
          We&apos;ll factor your enthusiasm into beta access ranking
        </p>
      )}
    </form>
  )
}
