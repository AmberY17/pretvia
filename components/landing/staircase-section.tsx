"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import confetti from "canvas-confetti";
import { Target } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { trainingLogs } from "@/components/landing/landing-data";

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

export function StaircaseSection() {
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
