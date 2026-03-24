"use client";

import { motion, useReducedMotion } from "framer-motion";
import { floatingEmojis } from "@/components/landing/landing-data";

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-16 sm:px-6">
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

        {/* Floating emojis */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 sm:mt-16 sm:gap-4">
          {floatingEmojis.map((emoji, i) => (
            <motion.span
              key={i}
              className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-xl shadow-lg sm:h-14 sm:w-14 sm:text-2xl${shouldReduceMotion ? "" : " animate-float"}`}
              style={shouldReduceMotion ? undefined : { animationDelay: `${i * 0.3}s` }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
            >
              {emoji}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-xs font-medium">Scroll to explore</span>
          <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/50">
            <motion.div
              animate={shouldReduceMotion ? {} : { y: [2, 14, 2] }}
              transition={
                shouldReduceMotion ? {} : { duration: 1.5, repeat: Infinity }
              }
              className="mx-auto mt-1 h-2 w-1.5 rounded-full bg-primary"
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
