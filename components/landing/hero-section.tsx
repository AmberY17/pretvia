"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { floatingEmojis } from "@/components/landing/landing-data";
import { Button } from "@/components/ui/button";
import { EmojiInputBox } from "./emoji-input-box";
import { EmojiCatchGame } from "./emoji-catch-game";

export function HeroSection() {
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.95]);
  const heroY = useTransform(scrollY, [0, 400], [0, 100]);
  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const [phase, setPhase] = useState<"input" | "floating" | "complete">("input");
  const [emojis, setEmojis] = useState<string[]>([...floatingEmojis]);
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);

  // Scroll lock during floating phase
  useEffect(() => {
    if (phase === "complete") return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const nav = document.querySelector<HTMLElement>("nav");
    document.documentElement.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    if (nav) {
      nav.style.paddingRight = `${scrollbarWidth}px`;
      nav.style.pointerEvents = "none";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.paddingRight = "";
      if (nav) {
        nav.style.paddingRight = "";
        nav.style.pointerEvents = "";
      }
    };
  }, [phase]);

  // Confetti on complete
  useEffect(() => {
    if (phase !== "complete" || prefersReduced) return;
    const end = Date.now() + 2000;
    const frame = () => {
      confetti({ particleCount: 5, spread: 70, origin: { y: 0.3 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [phase, prefersReduced]);

  return (
    <motion.section
      style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
      className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-16 sm:px-6"
    >
      {/* Gradient orb background */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.08] blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-primary/[0.05] blur-[100px]" />
      </div>

      <motion.div
        className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground sm:mb-6 sm:px-4 sm:text-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          Built for athletes and coaches
        </div>

        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-7xl">
          {"Log Your Training, "}
          <span className="bg-gradient-to-r from-primary to-[hsl(190,80%,50%)] bg-clip-text text-transparent">
            Visually.
          </span>
        </h1>

        <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
          Emoji-first training logs that make tracking sessions intuitive.
        </p>

        {/* Emoji grid */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 sm:mt-16 sm:gap-4">
          {phase === "input" &&
            emojis.map((emoji, i) => (
              <EmojiInputBox
                key={i}
                emoji={emoji}
                index={i}
                isEditing={activeEditIndex === i}
                prefersReduced={prefersReduced}
                onStartEdit={setActiveEditIndex}
                onConfirm={(idx, e) => {
                  setEmojis((prev) =>
                    prev.map((v, j) => (j === idx ? e : v))
                  );
                  setActiveEditIndex(null);
                }}
                onDismiss={() => setActiveEditIndex(null)}
              />
            ))}
          {phase === "complete" &&
            emojis.map((emoji, i) => (
              <span
                key={i}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-xl shadow-lg sm:h-14 sm:w-14 sm:text-2xl"
              >
                {emoji}
              </span>
            ))}
        </div>

        {/* Phase 1 CTA */}
        {phase === "input" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <p className="mt-4 text-sm text-muted-foreground">
              Click any emoji to swap it, then launch!
            </p>
            <Button className="mt-4" onClick={() => setPhase("floating")}>
              Launch 🚀
            </Button>
          </motion.div>
        )}

        {/* Phase 3 message */}
        {phase === "complete" && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-sm font-medium text-primary"
          >
            You caught them all! Scroll to explore ↓
          </motion.p>
        )}
      </motion.div>

      {/* Scroll indicator — visible only after game complete */}
      {phase === "complete" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={prefersReduced ? {} : { y: [0, 8, 0] }}
            transition={prefersReduced ? {} : { duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-muted-foreground"
          >
            <span className="text-xs font-medium">Scroll to explore</span>
            <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/50">
              <motion.div
                animate={prefersReduced ? {} : { y: [2, 14, 2] }}
                transition={
                  prefersReduced ? {} : { duration: 1.5, repeat: Infinity }
                }
                className="mx-auto mt-1 h-2 w-1.5 rounded-full bg-primary"
              />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Game overlay */}
      <AnimatePresence>
        {phase === "floating" && (
          <EmojiCatchGame
            emojis={emojis}
            prefersReduced={prefersReduced}
            onAllCaught={() => setPhase("complete")}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}
