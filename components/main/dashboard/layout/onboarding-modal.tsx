"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const ONBOARDING_KEY = "pretvia-onboarded"
const ONBOARDING_STEP_KEY = "pretvia-onboarding-step"

interface OnboardingModalProps {
  user: { displayName?: string | null; role?: string | null }
}

interface Step {
  title: string
  body: React.ReactNode
  actions: React.ReactNode
}

function useSteps(
  role: string,
  name: string,
  onDone: () => void,
  onNavigate: (nextStep: number, path: string) => void,
  router: ReturnType<typeof useRouter>,
) {
  const goToGroup = (stepIndex: number) => () => {
    onNavigate(stepIndex + 1, "/dashboard/group")
  }
  const goToDashboard = () => onDone()
  const goToParent = () => {
    onDone()
    router.push("/dashboard/parent")
  }
  const goToInstall = (stepIndex: number) => () => {
    onNavigate(stepIndex + 1, "/dashboard/account#install")
  }

  if (role === "coach") {
    const steps: Step[] = [
      {
        title: `Welcome, ${name}!`,
        body: (
          <p className="text-sm text-muted-foreground">
            You&apos;re all set as a coach on Pretvia — the emoji-first training log for your
            athletes.
          </p>
        ),
        actions: null,
      },
      {
        title: "Set up your group",
        body: (
          <p className="text-sm text-muted-foreground">
            Head to your Group page to create custom roles (e.g. Sabre, Foil) and set a weekly
            training schedule for your athletes.
          </p>
        ),
        actions: (
          <Button variant="outline" size="sm" onClick={goToGroup(1)}>
            Go to Group Page
          </Button>
        ),
      },
      {
        title: "Invite your athletes",
        body: (
          <p className="text-sm text-muted-foreground">
            Use the <strong className="text-foreground">Invite</strong> button (top right of the
            Athletes section) to send individual invites, or{" "}
            <strong className="text-foreground">Import CSV</strong> to add your whole roster at
            once.
          </p>
        ),
        actions: (
          <Button variant="outline" size="sm" onClick={goToGroup(2)}>
            Go to Group Page
          </Button>
        ),
      },
      {
        title: "Install the app",
        body: (
          <p className="text-sm text-muted-foreground">
            Add Pretvia to your home screen for the best experience — no app store needed.
          </p>
        ),
        actions: (
          <Button variant="outline" size="sm" onClick={goToInstall(3)}>
            How to install →
          </Button>
        ),
      },
      {
        title: "You're all set!",
        body: (
          <p className="text-sm text-muted-foreground">
            Your dashboard is ready. Athletes will appear once they accept their invites.
          </p>
        ),
        actions: (
          <Button size="sm" onClick={goToDashboard}>
            Go to Dashboard
          </Button>
        ),
      },
    ]
    return steps
  }

  if (role === "guardian") {
    const steps: Step[] = [
      {
        title: `Welcome, ${name}!`,
        body: (
          <p className="text-sm text-muted-foreground">
            You&apos;re all set as a guardian on Pretvia. You can see your athlete&apos;s training
            activity from your dashboard.
          </p>
        ),
        actions: null,
      },
      {
        title: "Install the app",
        body: (
          <p className="text-sm text-muted-foreground">
            Add Pretvia to your home screen for the best experience — no app store needed.
          </p>
        ),
        actions: (
          <Button variant="outline" size="sm" onClick={goToInstall(1)}>
            How to install →
          </Button>
        ),
      },
      {
        title: "You're all set!",
        body: (
          <p className="text-sm text-muted-foreground">
            Your dashboard is ready. You&apos;ll see your athlete&apos;s logs as they start
            training.
          </p>
        ),
        actions: (
          <Button size="sm" onClick={goToParent}>
            Go to Dashboard
          </Button>
        ),
      },
    ]
    return steps
  }

  // athlete (default)
  const steps: Step[] = [
    {
      title: `Welcome, ${name}!`,
      body: (
        <p className="text-sm text-muted-foreground">
          You&apos;re all set as an athlete on Pretvia — log every training session your way, in
          seconds.
        </p>
      ),
      actions: null,
    },
    {
      title: "Install the app",
      body: (
        <p className="text-sm text-muted-foreground">
          Add Pretvia to your home screen for the best experience — no app store needed.
        </p>
      ),
      actions: (
        <Button variant="outline" size="sm" onClick={goToInstall(1)}>
          How to install →
        </Button>
      ),
    },
    {
      title: "You're all set!",
      body: (
        <p className="text-sm text-muted-foreground">
          Your dashboard is ready. Tap the emoji button to log your first training session.
        </p>
      ),
      actions: (
        <Button size="sm" onClick={goToDashboard}>
          Go to Dashboard
        </Button>
      ),
    },
  ]
  return steps
}

export function OnboardingModal({ user }: OnboardingModalProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const router = useRouter()

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        const savedStep = localStorage.getItem(ONBOARDING_STEP_KEY)
        if (savedStep !== null) {
          const parsed = parseInt(savedStep, 10)
          if (!isNaN(parsed) && parsed > 0) setStep(parsed)
        }
        setOpen(true)
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1")
      localStorage.removeItem(ONBOARDING_STEP_KEY)
    } catch {
      // ignore
    }
    setOpen(false)
  }

  const navigateAndPause = (nextStep: number, path: string) => {
    try {
      localStorage.setItem(ONBOARDING_STEP_KEY, String(nextStep))
    } catch {
      // ignore
    }
    setOpen(false)
    router.push(path)
  }

  const role = user.role ?? "athlete"
  const name = user.displayName ?? "there"
  const steps = useSteps(role, name, dismiss, navigateAndPause, router)
  const current = steps[step]
  const isLast = step === steps.length - 1

  const handleNext = () => {
    if (isLast) {
      dismiss()
    } else {
      setStep((s) => s + 1)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) dismiss()
      }}
    >
      <DialogContent
        className="max-w-sm gap-0 p-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{current?.title}</DialogTitle>

        {/* Step content */}
        <div className="px-6 pt-8 pb-6 flex flex-col gap-3">
          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-4 bg-primary"
                    : i < step
                      ? "w-1.5 bg-primary/40"
                      : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          <h2 className="text-base font-semibold text-foreground">{current?.title}</h2>
          {current?.body}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
          <div className="flex items-center gap-2">{current?.actions}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip all
            </button>
            <Button size="sm" onClick={handleNext}>
              {isLast ? "Done" : "Next →"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
