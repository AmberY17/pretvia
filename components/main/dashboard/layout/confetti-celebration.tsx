"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { CELEBRATION_KEY } from "@/lib/constants";

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  if (v >= 11 && v <= 13) return n + "th";
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function isCelebrationEnabled(userId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(`${CELEBRATION_KEY}-${userId}`);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

interface ConfettiCelebrationProps {
  totalCount: number;
  onDismiss: () => void;
  userId: string;
}

export function ConfettiCelebration({ totalCount, onDismiss, userId }: ConfettiCelebrationProps) {
  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (!isCelebrationEnabled(userId)) {
      handleDismiss();
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!prefersReducedMotion) {
      const duration = 2500;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["hsl(var(--primary))", "hsl(var(--primary) / 0.8)", "hsl(var(--muted-foreground))"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["hsl(var(--primary))", "hsl(var(--primary) / 0.8)", "hsl(var(--muted-foreground))"],
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }

    const timer = setTimeout(handleDismiss, 3500);
    return () => clearTimeout(timer);
  }, [handleDismiss]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDismiss]);

  if (!isCelebrationEnabled(userId)) return null;

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={`${getOrdinal(totalCount)} log created`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={handleDismiss}
    >
      <motion.div
        role="status"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="pointer-events-none rounded-2xl border border-border bg-card px-10 py-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-6xl font-bold tabular-nums text-primary">
          {getOrdinal(totalCount)}
        </p>
        <p className="mt-2 text-center text-lg font-medium text-muted-foreground">log</p>
      </motion.div>
    </motion.div>,
    document.body
  );
}
