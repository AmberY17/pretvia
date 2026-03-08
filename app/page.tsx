"use client";

import { useState, useRef, useEffect } from "react";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    setMatches(m.matches);
    const handler = () => setMatches(m.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, [query]);
  return matches;
}
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
  useInView,
} from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowRight, ChartNoAxesCombined, Target } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { DeviceFrame } from "@/components/landing/device-frame";
import { RoleCards } from "@/components/landing/role-cards";

const floatingEmojis = [
  "\u{1F93A}", // Fencing
  "\u{1F4A6}", // Sweat
  "\u{1F525}", // Fire
  "\u{1F344}", // Mushroom
  "\u2B50\uFE0F", // Star
  "\u2601\uFE0F", // Cloud
];

// Tree fruits with their labels (positions scaled for larger tree)
const treeFruits = [
  {
    emoji: "\u{1F34E}",
    label: "Performance Tracking",
    position: { x: -110, y: -90 },
  },
  { emoji: "\u{1F34A}", label: "Self-awareness", position: { x: 135, y: -60 } },
  { emoji: "\u{1F347}", label: "Motivation", position: { x: -105, y: 60 } },
  { emoji: "\u{1F352}", label: "Confidence", position: { x: 120, y: 90 } },
];

// Mock training log data for staircase — Moment Ready has "Today"; other logs shifted one day back
const trainingLogs = [
  { emoji: "\u{1F93A}", note: "Form drills", date: "6 days ago" },
  { emoji: "\u{1F3C6}", note: "Tournament prep", date: "5 days ago" },
  { emoji: "\u{1F3AF}", note: "Bout practice", date: "4 days ago" },
  { emoji: "\u{1F4AA}", note: "Conditioning workout", date: "3 days ago" },
  { emoji: "\u2B50\uFE0F", note: "Great sparring session", date: "2 days ago" },
  { emoji: "\u{1F4AB}", note: "Intense footwork drills", date: "Yesterday" },
];

// ==================== SECTION COMPONENTS ====================

// Hero Section — no target ref needed; uses viewport-level scroll
function HeroSection() {
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.95]);
  const heroY = useTransform(scrollY, [0, 400], [0, 100]);
  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

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

        {/* Floating emojis */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 sm:mt-16 sm:gap-4">
          {floatingEmojis.map((emoji, i) => (
            <motion.span
              key={i}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-xl shadow-lg sm:h-14 sm:w-14 sm:text-2xl"
              initial={{ opacity: 0, scale: 0 }}
              animate={
                prefersReduced
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 1, scale: 1, y: [0, -8, 0] }
              }
              transition={
                prefersReduced
                  ? { delay: 0.5 + i * 0.1, duration: 0.3 }
                  : {
                      opacity: { delay: 0.5 + i * 0.1, duration: 0.3 },
                      scale: { delay: 0.5 + i * 0.1, duration: 0.3 },
                      y: {
                        duration: 3,
                        delay: i * 0.3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }
              }
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
        <motion.div
          animate={prefersReduced ? {} : { y: [0, 8, 0] }}
          transition={prefersReduced ? {} : { duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-xs font-medium">Scroll to explore</span>
          <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/50">
            <motion.div
              animate={prefersReduced ? {} : { y: [2, 14, 2] }}
              transition={prefersReduced ? {} : { duration: 1.5, repeat: Infinity }}
              className="mx-auto mt-1 h-2 w-1.5 rounded-full bg-primary"
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

// Product Section with 3D mockup — reverses on scroll up
function ProductSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: false });

  return (
    <section ref={ref} className="relative px-4 py-12 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl overflow-hidden">
        <motion.div
          initial={{ rotateX: 15, scale: 0.85, opacity: 0 }}
          animate={{
            rotateX: inView ? 0 : 15,
            scale: inView ? 1 : 0.85,
            opacity: inView ? 1 : 0,
          }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="perspective-1000 preserve-3d relative"
        >
          <DeviceFrame
            imageSrc="/screenshots/athlete-dashboard.png"
            imageAlt="Pretvia Dashboard Preview"
            animate={false}
            className="mx-auto w-full max-w-4xl"
          />
        </motion.div>
      </div>
    </section>
  );
}

// Sub-tree SVG — no fruits, no labels
function SubTreeSvg({
  className,
  inView,
}: {
  className?: string;
  inView: boolean;
}) {
  return (
    <svg
      viewBox="0 0 200 250"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <motion.path
        d="M100 250 L100 140 Q100 100 80 80 M100 140 Q100 100 120 80"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        className="text-primary/50"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: inView ? 1 : 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      <motion.path
        d="M85 120 Q50 100 30 70 M75 100 Q45 85 25 110 M115 120 Q150 100 170 70 M125 100 Q155 85 175 110"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="text-primary/40"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: inView ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
      />
    </svg>
  );
}

// Growth Tree Section — main tree + sub-trees, uses useInView for scroll-up reversal
function GrowthTreeSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.2, once: false });

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden sm:px-6 sm:py-20"
    >
      <div className="relative w-full max-w-4xl">
        {/* Sub-trees — hidden on mobile to avoid clutter; show from sm */}
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5 }}
          className="absolute -left-12 top-1/2 hidden -translate-y-1/2 w-24 h-28 text-primary/40 sm:block md:w-32 md:h-36"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="absolute -left-4 top-1/4 hidden w-20 h-24 text-primary/35 sm:block md:w-24 md:h-28"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="absolute -right-8 top-1/3 hidden w-20 h-24 text-primary/40 sm:block md:w-28 md:h-32"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="absolute -right-2 bottom-1/3 hidden w-14 h-18 text-primary/35 sm:block md:w-20 md:h-24"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="absolute left-1/4 -bottom-4 hidden w-16 h-20 text-primary/30 sm:block md:w-20 md:h-24"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="absolute right-1/4 -top-2 hidden w-20 h-24 text-primary/35 sm:block md:w-24 md:h-28"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="absolute left-[15%] top-1/4 hidden w-16 h-20 text-primary/25 sm:block md:w-20 md:h-24"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="absolute right-[12%] top-1/2 hidden -translate-y-1/2 w-16 h-20 text-primary/30 sm:block md:w-20 md:h-24"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>

        {/* Main tree with fruits — responsive width */}
        <div className="relative mx-auto w-full max-w-[420px] h-[360px] sm:h-[420px] md:h-[480px] md:max-w-[560px] md:h-[640px]">
          <svg
            viewBox="0 0 200 250"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.path
              d="M100 250 L100 140 Q100 100 80 80 M100 140 Q100 100 120 80"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className="text-primary/70"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: inView ? 1 : 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
            <motion.path
              d="M85 120 Q50 100 30 70 M75 100 Q45 85 25 110"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              className="text-primary/60"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: inView ? 1 : 0 }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            />
            <motion.path
              d="M115 120 Q150 100 170 70 M125 100 Q155 85 175 110"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              className="text-primary/60"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: inView ? 1 : 0 }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            />
            <motion.path
              d="M80 80 Q60 50 50 30 M120 80 Q140 50 150 30 M90 70 Q100 40 100 20 M110 70 Q100 40 100 20"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className="text-primary/50"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: inView ? 1 : 0 }}
              transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
            />
          </svg>

          {treeFruits.map((fruit, i) => (
            <FruitWithLabel
              key={fruit.label}
              fruit={fruit}
              index={i}
              inView={inView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// Fruit component — spring pop, reverses when scrolling up
function FruitWithLabel({
  fruit,
  index,
  inView,
}: {
  fruit: (typeof treeFruits)[0];
  index: number;
  inView: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: inView ? 1 : 0,
        opacity: inView ? 1 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 700,
        damping: 12,
        delay: inView ? 1.2 + index * 0.3 : 0,
      }}
      style={{
        position: "absolute",
        left: `calc(50% + ${fruit.position.x}px)`,
        top: `calc(40% + ${fruit.position.y}px)`,
        x: "-50%",
        y: "-50%",
      }}
      className="flex flex-col items-center gap-2"
    >
      <span className="text-5xl md:text-6xl drop-shadow-lg">{fruit.emoji}</span>
      <span className="whitespace-nowrap rounded-full bg-card/90 px-3 py-1 text-sm font-medium text-foreground shadow-md border border-border">
        {fruit.label}
      </span>
    </motion.div>
  );
}

// Side-emitted confetti — fires when last training log stacks (before Moment Ready)
function useSideConfetti(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const duration = 2500;
    const end = Date.now() + duration;
    const opts = {
      particleCount: 6,
      spread: 55,
      colors: [
        "hsl(var(--primary))",
        "hsl(var(--primary) / 0.8)",
        "#22c55e",
        "#eab308",
        "#3b82f6",
        "#ec4899",
      ] as string[],
      zIndex: 9999,
    };

    const frame = () => {
      confetti({ ...opts, angle: 60, origin: { x: 0 } });
      confetti({ ...opts, angle: 120, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [active]);
}

// Staircase card — reverses on scroll up; last card reveals Moment Ready (same as other logs)
function StaircaseCard({
  log,
  index,
  totalCount,
  onLastCardComplete,
  stepX,
  stepY,
  sectionInView,
}: {
  log: (typeof trainingLogs)[0];
  index: number;
  totalCount: number;
  onLastCardComplete?: () => void;
  stepX: number;
  stepY: number;
  sectionInView: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isLast = index === totalCount - 1;
  const fromLeft = index % 2 === 0;

  return (
    <motion.div
      ref={ref}
      initial={{
        x: fromLeft ? -300 : 300,
        opacity: 0,
        rotate: fromLeft ? -12 : 12,
      }}
      animate={{
        x: sectionInView ? 0 : fromLeft ? -300 : 300,
        opacity: sectionInView ? 1 : 0,
        rotate: sectionInView ? 0 : fromLeft ? -12 : 12,
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 22,
        delay: sectionInView ? index * 0.18 : 0,
      }}
      onAnimationComplete={
        isLast && sectionInView ? onLastCardComplete : undefined
      }
      style={{
        position: "absolute",
        bottom: `${index * stepY}px`,
        left: `${index * stepX}px`,
        zIndex: index,
      }}
      className="w-[200px] rounded-xl border border-border bg-card p-4 shadow-lg sm:w-[340px] md:w-[380px] sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{log.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-foreground truncate">
            {log.note}
          </p>
          <p className="text-sm text-muted-foreground">{log.date}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Moment Ready card — starts zoomed in (fills viewport), zooms out with slam effect; styled like a log card
function MomentReadyCard({
  index,
  inView,
  stepX,
  stepY,
}: {
  index: number;
  inView: boolean;
  stepX: number;
  stepY: number;
}) {
  return (
    <motion.div
      initial={{
        scale: 4,
        opacity: 1,
      }}
      animate={{
        scale: inView ? [4, 1.08, 0.97, 1] : 4,
        opacity: inView ? 1 : 1,
      }}
      transition={{
        scale: {
          duration: 1,
          times: [0, 0.7, 0.85, 1],
          ease: [0.22, 1, 0.36, 1],
        },
        delay: inView ? 0.1 : 0,
      }}
      style={{
        position: "absolute",
        bottom: `${index * stepY}px`,
        left: `${index * stepX}px`,
        zIndex: index,
        transformOrigin: "center center",
      }}
      className="w-[200px] rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-lg sm:w-[340px] md:w-[380px] sm:p-5"
    >
      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-foreground">Moment Ready</p>
          <p className="text-sm text-muted-foreground">Today</p>
        </div>
      </div>
    </motion.div>
  );
}

// Staircase Section — Confetti when last training log stacks; Moment Ready appears (treated like other logs)
function StaircaseSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.1, once: false });
  const [showConfetti, setShowConfetti] = useState(false);
  const [badgeRevealed, setBadgeRevealed] = useState(false);
  const isSm = useMediaQuery("(min-width: 640px)");
  const stepX = isSm ? 64 : 32;
  const stepY = isSm ? 72 : 44;
  const mobileLogCount = 4;
  const displayedLogs = isSm
    ? trainingLogs
    : trainingLogs.slice(-mobileLogCount);

  useSideConfetti(showConfetti);

  const handleLastCardComplete = () => {
    if (badgeRevealed) return;
    setShowConfetti(true);
    setBadgeRevealed(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  return (
    <section
      ref={ref}
      className="relative min-h-[380px] px-4 py-12 sm:min-h-[600px] sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 20 }}
          transition={{ duration: 0.5 }}
          className="mb-4 text-center text-2xl font-bold text-foreground md:text-3xl"
        >
          Every minute stacks.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12 text-center text-muted-foreground"
        >
          Every log becomes a step.
        </motion.p>

        {/* Staircase container — mobile: 4 logs, smaller steps/cards; desktop: full staircase */}
        <div className="relative flex min-h-[280px] items-end justify-center overflow-hidden px-2 py-6 sm:min-h-[580px] sm:justify-start sm:px-6 sm:py-0 sm:pl-12 md:pl-24 lg:pl-40">
          <div
            className="relative mx-auto sm:mx-0"
            style={{
              width: displayedLogs.length * stepX + (isSm ? 380 : 200),
              minHeight: displayedLogs.length * stepY + (isSm ? 100 : 80),
            }}
          >
            {displayedLogs.map((log, i) => (
              <StaircaseCard
                key={i}
                log={log}
                index={i}
                totalCount={displayedLogs.length}
                onLastCardComplete={handleLastCardComplete}
                stepX={stepX}
                stepY={stepY}
                sectionInView={inView}
              />
            ))}
            {badgeRevealed && (
              <MomentReadyCard
                index={displayedLogs.length}
                inView={inView}
                stepX={stepX}
                stepY={stepY}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Final Hook Section — "Be ready for your moment" with left-to-right shine on scroll
function FinalHookSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: false });

  return (
    <section
      ref={ref}
      className="relative flex min-h-[70vh] items-center justify-center px-4 py-12 sm:px-6 sm:py-20"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: inView ? 1 : 0.7, scale: inView ? 1 : 0.95 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative text-center"
      >
        <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-foreground pb-2 sm:text-4xl md:text-6xl lg:text-7xl">
          <span className="text-muted-foreground/60">Pretvia:</span>
          <br />
          <span className="relative inline-block overflow-hidden pb-1">
            <span className="bg-gradient-to-r from-primary via-primary to-[hsl(190,80%,50%)] bg-clip-text text-transparent">
              Be ready for your moment.
            </span>
            {/* Shine — sweep left to right when scrolled into view */}
            <motion.span
              className="absolute inset-0 w-2/3 bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/55 pointer-events-none"
              style={{
                transformOrigin: "left",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              initial={{ x: "-100%" }}
              animate={{ x: inView ? "250%" : "-100%" }}
              transition={{
                duration: 1.8,
                ease: [0.2, 0.8, 0.4, 1],
                delay: inView ? 0.2 : 0,
              }}
            />
          </span>
        </h2>
      </motion.div>
    </section>
  );
}

// CTA Section — reverses on scroll up
function CtaSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.2, once: false });

  return (
    <section ref={ref} className="px-4 py-12 sm:px-6 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 30 }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-xl text-center"
      >
        <Link href="/auth">
          <Button
            size="lg"
            className="gap-2 bg-primary px-10 py-6 text-lg text-primary-foreground hover:bg-primary/90"
          >
            Get started for free
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </motion.div>
    </section>
  );
}

// Built for every role section — reverses on scroll up
function BuiltForRoleSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.1, once: false });

  return (
    <section ref={ref} className="relative px-4 py-12 sm:px-6 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: inView ? 1 : 0,
          y: inView ? 0 : 20,
        }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-5xl"
      >
        <h2 className="mb-2 text-center text-3xl font-bold text-foreground md:text-4xl">
          Built for every role
        </h2>
        <p className="mb-12 text-center text-lg text-muted-foreground">
          Whether you coach, train, or support from the sidelines.
        </p>
        <RoleCards />
      </motion.div>
    </section>
  );
}

// ==================== MAIN PAGE COMPONENT ====================

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Fixed Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Pretvia"
              width={28}
              height={28}
              className="h-7 w-7 object-contain dark:hidden"
            />
            <Image
              src="/logo_dark_white.png"
              alt="Pretvia"
              width={28}
              height={28}
              className="hidden h-7 w-7 object-contain dark:block"
            />
            <span className="font-brand text-lg font-bold uppercase tracking-[0.15em] text-foreground">
              Pretvia
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/features">
              <Button variant="ghost" size="sm">
                Features
              </Button>
            </Link>
            <Link href="/auth">
              <Button variant="ghost-secondary" size="sm" className="gap-2">
                Sign In
              </Button>
            </Link>
            <ThemeSwitcher />
          </div>
        </div>
      </nav>

      {/* Section 1: Hero */}
      <HeroSection />

      {/* Section 2: Dashboard Mockup */}
      <ProductSection />

      {/* Section 3: The Growth Tree */}
      <GrowthTreeSection />

      {/* Section 4: The Staircase of Logs */}
      <StaircaseSection />

      {/* Section 5: Built for every role — reverses on scroll up */}
      <BuiltForRoleSection />

      {/* Section 6: Final Hook — shine sweeps left to right on scroll into view */}
      <FinalHookSection />

      {/* Section 7: CTA — reverses on scroll up */}
      <CtaSection />

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Pretvia"
              width={24}
              height={24}
              className="h-6 w-6 object-contain dark:hidden"
            />
            <Image
              src="/logo_dark_white.png"
              alt="Pretvia"
              width={24}
              height={24}
              className="hidden h-6 w-6 object-contain dark:block"
            />
            <span className="font-brand text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Pretvia
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/features"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <div className="flex items-center gap-1">
              <ChartNoAxesCombined className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                En garde, Pretvia, Allez!
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
