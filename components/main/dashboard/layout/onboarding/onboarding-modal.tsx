"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const onboardingKey = (userId: string) => `pretvia-onboarded-${userId}`
const onboardingStepKey = (userId: string) => `pretvia-onboarding-step-${userId}`

interface OnboardingModalProps {
  user: {
    id: string
    displayName?: string | null
    role?: string | null
  }
}

interface Step {
  title: string
  body: React.ReactNode
  actions: React.ReactNode
}

function useSteps(role: string, name: string): Step[] {
  return [
    {
      title: `Welcome, ${name}!`,
      body: (
        <p className="text-sm text-muted-foreground">
          You&apos;re all set as a {role} on Pretvia.
        </p>
      ),
      actions: null,
    },
    {
      title: "You're an early user",
      body: (
        <p className="text-sm text-muted-foreground">
          Thank you for trying Pretvia! We&apos;re still in beta, so you may run into the occasional
          bug or rough edge. If something looks off, use the{" "}
          <strong className="text-foreground">feedback bubble</strong> at the bottom right corner to
          let us know.
        </p>
      ),
      actions: null,
    },
  ]
}

export function OnboardingModal({ user }: OnboardingModalProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      if (!localStorage.getItem(onboardingKey(user.id))) {
        const savedStep = localStorage.getItem(onboardingStepKey(user.id))
        if (savedStep !== null) {
          const parsed = parseInt(savedStep, 10)
          if (!isNaN(parsed) && parsed > 0) setStep(parsed)
        }
        setOpen(true)
      }
    } catch {
      // ignore storage errors
    }
  }, [user.id])

  const dismiss = () => {
    try {
      localStorage.setItem(onboardingKey(user.id), "1")
      localStorage.removeItem(onboardingStepKey(user.id))
    } catch {
      // ignore
    }
    setOpen(false)
  }

  const role = user.role ?? "athlete"
  const name = user.displayName ?? "there"
  const steps = useSteps(role, name)
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
