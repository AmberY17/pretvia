"use client"

import { useEffect, useState } from "react"
import { VercelToolbar } from "@vercel/toolbar/next"

export function DevToolbar() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return null
  return <VercelToolbar />
}
