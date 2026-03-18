"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

interface Particle {
  id: number
  emoji: string
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  vr: number
  caught: boolean
}

interface EmojiCatchGameProps {
  emojis: string[]
  prefersReduced: boolean
  onAllCaught: () => void
}

export function EmojiCatchGame({ emojis, prefersReduced, onAllCaught }: EmojiCatchGameProps) {
  const particlesRef = useRef<Particle[]>([])
  const domRefs = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number | null>(null)
  const [caught, setCaught] = useState<Set<number>>(new Set())

  // Initialize particles
  useEffect(() => {
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    particlesRef.current = emojis.map((emoji, id) => ({
      id,
      emoji,
      x: cx + (Math.random() - 0.5) * 100,
      y: cy + (Math.random() - 0.5) * 100,
      vx: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 3),
      vy: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 3),
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 6,
      caught: false,
    }))
  }, [emojis])

  // RAF physics loop
  useEffect(() => {
    if (prefersReduced) return

    const PARTICLE_SIZE = 56

    const tick = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight

      for (const p of particlesRef.current) {
        if (p.caught) continue

        p.x += p.vx
        p.y += p.vy
        p.rotation += p.vr

        if (p.x <= 0) {
          p.x = 0
          p.vx = Math.abs(p.vx)
        } else if (p.x + PARTICLE_SIZE >= vw) {
          p.x = vw - PARTICLE_SIZE
          p.vx = -Math.abs(p.vx)
        }

        if (p.y <= 0) {
          p.y = 0
          p.vy = Math.abs(p.vy)
        } else if (p.y + PARTICLE_SIZE >= vh) {
          p.y = vh - PARTICLE_SIZE
          p.vy = -Math.abs(p.vy)
        }

        const el = domRefs.current[p.id]
        if (el) {
          el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg)`
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [prefersReduced])

  // Resize: clamp positions to new bounds
  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      for (const p of particlesRef.current) {
        p.x = Math.min(p.x, vw - 56)
        p.y = Math.min(p.y, vh - 56)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  function handleCatch(id: number) {
    particlesRef.current[id].caught = true
    setCaught((prev) => {
      const next = new Set(prev).add(id)
      if (next.size === emojis.length) setTimeout(onAllCaught, 500)
      return next
    })
  }

  // Reduced motion: static clickable grid
  if (prefersReduced) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
        <p className="text-sm font-medium text-muted-foreground">
          Tap each emoji to catch it! {caught.size} / {emojis.length}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {emojis.map((emoji, id) => (
            <button
              key={id}
              onClick={() => !caught.has(id) && handleCatch(id)}
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-2xl shadow-lg transition-opacity"
              style={{ opacity: caught.has(id) ? 0.3 : 1 }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* HUD */}
      <div className="fixed left-1/2 top-4 z-[61] -translate-x-1/2 pointer-events-none">
        <div className="rounded-full border border-border bg-card/90 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-sm">
          Catch them all! {caught.size} / {emojis.length}
        </div>
      </div>

      {emojis.map((emoji, id) => {
        const isCaught = caught.has(id)
        const p = particlesRef.current[id]
        const startX = p?.x ?? window.innerWidth / 2
        const startY = p?.y ?? window.innerHeight / 2

        return (
          <div
            key={id}
            ref={(el) => {
              domRefs.current[id] = el
            }}
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              transform: `translate(${startX}px, ${startY}px)`,
              pointerEvents: isCaught ? "none" : "auto",
            }}
          >
            {isCaught ? (
              <motion.div
                className="flex h-14 w-14 cursor-default items-center justify-center rounded-2xl border border-border bg-card text-2xl shadow-lg"
                animate={{ scale: [1, 1.6, 0], opacity: [1, 1, 0] }}
                transition={{ duration: 0.5 }}
              >
                {emoji}
              </motion.div>
            ) : (
              <button className="cursor-pointer p-4" onClick={() => handleCatch(id)}>
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-2xl shadow-lg transition-transform active:scale-90">
                  {emoji}
                </span>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
