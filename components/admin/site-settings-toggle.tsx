"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

interface SiteSettingsToggleProps {
  initialPricingPageVisible: boolean
  initialAddOnsVisible: boolean
}

export function SiteSettingsToggle({
  initialPricingPageVisible,
  initialAddOnsVisible,
}: SiteSettingsToggleProps) {
  const [pricingPageVisible, setPricingPageVisible] = useState(initialPricingPageVisible)
  const [addOnsVisible, setAddOnsVisible] = useState(initialAddOnsVisible)

  const handlePricingToggle = async (checked: boolean) => {
    const prev = pricingPageVisible
    setPricingPageVisible(checked)

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricingPageVisible: checked }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to update settings")
        setPricingPageVisible(prev)
      } else {
        toast.success(checked ? "Pricing page enabled" : "Pricing page hidden")
      }
    } catch {
      toast.error("Network error")
      setPricingPageVisible(prev)
    }
  }

  const handleAddOnsToggle = async (checked: boolean) => {
    const prev = addOnsVisible
    setAddOnsVisible(checked)

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addOnsVisible: checked }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to update settings")
        setAddOnsVisible(prev)
      } else {
        toast.success(checked ? "Club add-ons shown" : "Club add-ons hidden")
      }
    } catch {
      toast.error("Network error")
      setAddOnsVisible(prev)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Pricing page</p>
          <p className="text-xs text-muted-foreground">
            {pricingPageVisible ? "Visible at /pricing" : "Returns 404"}
          </p>
        </div>
        <Switch checked={pricingPageVisible} onCheckedChange={handlePricingToggle} />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Club add-ons</p>
          <p className="text-xs text-muted-foreground">
            {addOnsVisible ? "Add-on cards shown in club billing" : "Add-on cards hidden in club billing"}
          </p>
        </div>
        <Switch checked={addOnsVisible} onCheckedChange={handleAddOnsToggle} />
      </div>
    </div>
  )
}
