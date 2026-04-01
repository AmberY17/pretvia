"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const CHECKLIST_KEY = "pretvia-coach-checklist"
export const COACH_ONBOARDING_DONE_KEY = "pretvia-coach-onboarding-done"

type ChecklistState = {
  createGroup: boolean
  setupGroup: boolean
  inviteAthletes: boolean
  installApp: boolean
}

const ITEMS: {
  key: keyof ChecklistState
  label: string
  description: string
  href: string
}[] = [
  {
    key: "createGroup",
    label: "Create your group",
    description: "Give your group a name to get started",
    href: "/dashboard",
  },
  {
    key: "setupGroup",
    label: "Set up your group",
    description: "Add custom roles and a weekly training schedule",
    href: "/dashboard/group",
  },
  {
    key: "inviteAthletes",
    label: "Invite your athletes",
    description: "Send invites or import a CSV roster",
    href: "/dashboard/group",
  },
  {
    key: "installApp",
    label: "Install the app",
    description: "Add to your home screen — no app store needed",
    href: "/dashboard/account#install",
  },
]

interface CoachOnboardingChecklistProps {
  hasGroup: boolean
  onComplete: () => void
}

export function CoachOnboardingChecklist({
  hasGroup,
  onComplete,
}: CoachOnboardingChecklistProps) {
  const router = useRouter()
  const [checks, setChecks] = useState<ChecklistState>({
    createGroup: false,
    setupGroup: false,
    inviteAthletes: false,
    installApp: false,
  })

  useEffect(() => {
    try {
      const saved: Partial<ChecklistState> =
        JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "null") ?? {}
      const next: ChecklistState = {
        createGroup: Boolean(saved.createGroup) || hasGroup,
        setupGroup: Boolean(saved.setupGroup),
        inviteAthletes: Boolean(saved.inviteAthletes),
        installApp: Boolean(saved.installApp),
      }
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next))
      setChecks(next)
      if (Object.values(next).every(Boolean)) {
        localStorage.setItem(COACH_ONBOARDING_DONE_KEY, "1")
        onComplete()
      }
    } catch {
      // ignore storage errors
    }
  }, [hasGroup])

  const markAndNavigate = (key: keyof ChecklistState, href: string) => {
    setChecks((prev) => {
      const next = { ...prev, [key]: true }
      try {
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next))
        if (Object.values(next).every(Boolean)) {
          localStorage.setItem(COACH_ONBOARDING_DONE_KEY, "1")
          onComplete()
        }
      } catch {
        // ignore
      }
      return next
    })
    router.push(href)
  }

  const skipAll = () => {
    try {
      localStorage.setItem(COACH_ONBOARDING_DONE_KEY, "1")
    } catch {
      // ignore
    }
    onComplete()
  }

  return (
    <div className="flex flex-col rounded-2xl border border-dashed border-border px-4 py-5">
      <div className="flex flex-col gap-0.5">
        {ITEMS.map((item) => {
          const done = checks[item.key]
          return (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                done
                  ? router.push(item.href)
                  : markAndNavigate(item.key, item.href)
              }
              className={cn(
                "flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                done ? "cursor-default" : "cursor-pointer hover:bg-secondary/60",
              )}
            >
              {done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p
                  className={cn(
                    "text-sm font-medium leading-snug",
                    done
                      ? "text-muted-foreground line-through"
                      : "text-foreground",
                  )}
                >
                  {item.label}
                </p>
                {!done && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={skipAll}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip onboarding
        </button>
      </div>
    </div>
  )
}

export function isCoachOnboardingDone(): boolean {
  try {
    return !!localStorage.getItem(COACH_ONBOARDING_DONE_KEY)
  } catch {
    return false
  }
}
