"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

const WELCOME_KEY = "pretvia-welcome-shown"

const TAGLINES: Record<string, string> = {
  coach: "Lead your team with clarity and precision!",
  athlete: "Log sessions your way, in seconds!",
  guardian: "Stay connected with their journey!",
}

interface WelcomeBannerProps {
  user: { displayName?: string; role?: string }
}

export function WelcomeBanner({ user }: WelcomeBannerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(WELCOME_KEY)) {
        localStorage.setItem(WELCOME_KEY, "1")
        setVisible(true)
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  if (!visible) return null

  const tagline = TAGLINES[user.role ?? ""] ?? ""
  const name = user.displayName ?? "there"

  return (
    <div className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">Welcome, {name}!</p>
          {tagline && <p className="text-sm text-muted-foreground">{tagline}</p>}
          <p className="mt-1 text-sm text-muted-foreground">
            Install the app on your device for the best experience.{" "}
            <Link
              href="/dashboard/account#install"
              className="text-foreground underline underline-offset-2 hover:opacity-80"
            >
              How to install →
            </Link>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
