"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

interface EasterEggsToggleProps {
  initialEggSuperEarlyAccess: boolean
  initialEggClickFrenzy: boolean
  initialEggEmojiCatch: boolean
  initialEggForgotPassword: boolean
  initialEggSlotMachineEmoji: boolean
}

function EggRow({
  label,
  description,
  field,
  checked,
  onToggle,
}: {
  label: string
  description: string
  field: string
  checked: boolean
  onToggle: (field: string, checked: boolean) => Promise<void>
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={(val) => onToggle(field, val)} />
    </div>
  )
}

export function EasterEggsToggle({
  initialEggSuperEarlyAccess,
  initialEggClickFrenzy,
  initialEggEmojiCatch,
  initialEggForgotPassword,
  initialEggSlotMachineEmoji,
}: EasterEggsToggleProps) {
  const [eggSuperEarlyAccess, setEggSuperEarlyAccess] = useState(initialEggSuperEarlyAccess)
  const [eggClickFrenzy, setEggClickFrenzy] = useState(initialEggClickFrenzy)
  const [eggEmojiCatch, setEggEmojiCatch] = useState(initialEggEmojiCatch)
  const [eggForgotPassword, setEggForgotPassword] = useState(initialEggForgotPassword)
  const [eggSlotMachineEmoji, setEggSlotMachineEmoji] = useState(initialEggSlotMachineEmoji)

  const setters: Record<string, (val: boolean) => void> = {
    eggSuperEarlyAccess: setEggSuperEarlyAccess,
    eggClickFrenzy: setEggClickFrenzy,
    eggEmojiCatch: setEggEmojiCatch,
    eggForgotPassword: setEggForgotPassword,
    eggSlotMachineEmoji: setEggSlotMachineEmoji,
  }

  const values: Record<string, boolean> = {
    eggSuperEarlyAccess,
    eggClickFrenzy,
    eggEmojiCatch,
    eggForgotPassword,
    eggSlotMachineEmoji,
  }

  const handleToggle = async (field: string, checked: boolean) => {
    const prev = values[field]
    setters[field](checked)

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: checked }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to update settings")
        setters[field](prev)
      } else {
        toast.success(checked ? "Easter egg enabled" : "Easter egg disabled")
      }
    } catch {
      toast.error("Network error")
      setters[field](prev)
    }
  }

  return (
    <div className="space-y-2">
      <EggRow
        label="Super early access"
        description='Clicking gap in button → hidden "super" input'
        field="eggSuperEarlyAccess"
        checked={eggSuperEarlyAccess}
        onToggle={handleToggle}
      />
      <EggRow
        label="Click frenzy"
        description="First click starts 3-second mashing window with beta ranking message"
        field="eggClickFrenzy"
        checked={eggClickFrenzy}
        onToggle={handleToggle}
      />
      <EggRow
        label="Emoji catch"
        description="Physics mini-game on landing page hero"
        field="eggEmojiCatch"
        checked={eggEmojiCatch}
        onToggle={handleToggle}
      />
      <EggRow
        label="Forgot password hint"
        description='Shows typed password back at user — "Hmm, have you tried this one?"'
        field="eggForgotPassword"
        checked={eggForgotPassword}
        onToggle={handleToggle}
      />
      <EggRow
        label="Slot machine emoji picker"
        description="Athletes spin a slot machine to pick their profile emoji"
        field="eggSlotMachineEmoji"
        checked={eggSlotMachineEmoji}
        onToggle={handleToggle}
      />
    </div>
  )
}
