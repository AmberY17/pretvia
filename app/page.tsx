"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { ArrowRight, ChartNoAxesCombined } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { DeviceFrame } from "@/components/landing/device-frame";

const floatingEmojis = [
  "\u{1F93A}", // Fencing
  "\u{1F4A6}", // Sweat
  "\u{1F525}", // Fire
  "\u{1F344}", // Mushroom
  "\u2B50\uFE0F", // Star
  "\u2601\uFE0F", // Cloud
];

// Tree fruits with their labels
const treeFruits = [
  { emoji: "\u{1F34E}", label: "Performance Tracking", position: { x: -90, y: -60 } }, // Apple - top left
  { emoji: "\u{1F34A}", label: "Self-awareness", position: { x: 90, y: -40 } }, // Orange - top right
  { emoji: "\u{1F347}", label: "Motivation", position: { x: -70, y: 40 } }, // Grapes - bottom left
  { emoji: "\u{1F352}", label: "Confidence", position: { x: 80, y: 60 } }, // Cherry - bottom right
];

// Mock training log data for staircase
const trainingLogs = [
  { emoji: "\u{1F525}", note: "Intense footwork drills", date: "Today" },
  { emoji: "\u2B50\uFE0F", note: "Great sparring session", date: "Yesterday" },
  { emoji: "\u{1F4A6}", note: "Conditioning workout", date: "2 days ago" },
  { emoji: "\u{1F93A}", note: "Bout practice", date: "3 days ago" },
  { emoji: "\u{1F525}", note: "Tournament prep", date: "4 days ago" },
];

// Confetti particle component
function ConfettiParticle({ index }: { index: number }) {
  const colors = ["#22c55e", "#eab308", "#ef4444", "#3b82f6", "#a855f7", "#f97316"];
  const color = colors[index % colors.length];
  const randomX = Math.random() * 100;
  const randomDelay = Math.random() * 0.3;
  const randomDuration = 2 + Math.random() * 1;
  
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{ 
        backgroundColor: color,
        left: `${randomX}%`,
        top: "-20px"
      }}
      initial={{ y: 0, rotate: 0, opacity: 1 }}
      animate={{ 
        y: "100vh", 
        rotate: 720,
        opacity: [1, 1, 0]
      }}
      transition={{ 
        duration: randomDuration, 
        delay: randomDelay,
        ease: "easeIn"
      }}
    />
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  const productRef = useRef<HTMLElement>(null);
  const treeRef = useRef<HTMLElement>(null);
  const staircaseRef = useRef<HTMLElement>(null);

  const [showConfetti, setShowConfetti] = useState(false);
  const [badgeRevealed, setBadgeRevealed] = useState(false);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
    layoutEffect: false,
  });

  const { scrollYProgress: productProgress } = useScroll({
    target: productRef,
    offset: ["start end", "end start"],
    layoutEffect: false,
  });

  const { scrollYProgress: treeProgress } = useScroll({
    target: treeRef,
    offset: ["start end", "end center"],
    layoutEffect: false,
  });

  const { scrollYProgress: staircaseProgress } = useScroll({
    target: staircaseRef,
    offset: ["start end", "end center"],
    layoutEffect: false,
  });

  const heroOpacity = useTransform(heroProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(heroProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(heroProgress, [0, 0.5], [0, 100]);

  const productRotateX = useTransform(productProgress, [0, 0.4], [15, 0]);
  const productScale = useTransform(productProgress, [0, 0.4], [0.85, 1]);
  const productOpacity = useTransform(productProgress, [0, 0.25], [0, 1]);

  // Fruit reveal thresholds
  const fruit1Progress = useTransform(treeProgress, [0.1, 0.25], [0, 1]);
  const fruit2Progress = useTransform(treeProgress, [0.25, 0.4], [0, 1]);
  const fruit3Progress = useTransform(treeProgress, [0.4, 0.55], [0, 1]);
  const fruit4Progress = useTransform(treeProgress, [0.55, 0.7], [0, 1]);
  const fruitProgresses = [fruit1Progress, fruit2Progress, fruit3Progress, fruit4Progress];

  // Staircase card reveals
  const cardProgresses = trainingLogs.map((_, i) => 
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTransform(staircaseProgress, [i * 0.15, i * 0.15 + 0.15], [0, 1])
  );

  // Trigger confetti when all cards are stacked
  useEffect(() => {
    return staircaseProgress.on("change", (v) => {
      if (v > 0.85 && !badgeRevealed) {
        setBadgeRevealed(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    });
  }, [staircaseProgress, badgeRevealed]);

  return (
    <main className="min-h-screen">
      {/* Fixed Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
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
            <ThemeSwitcher />
            <Link href="/auth">
              <Button variant="ghost-secondary" size="sm" className="gap-2">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Section 1: Hero - Clean, focused on scroll indicator */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16"
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
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            Built for athletes and coaches
          </div>

          <h1 className="text-balance text-5xl font-bold leading-tight tracking-tight text-foreground md:text-7xl">
            {"Log Your Training, "}
            <span className="bg-gradient-to-r from-primary to-[hsl(190,80%,50%)] bg-clip-text text-transparent">
              Visually.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Emoji-first training logs that make tracking sessions intuitive.
          </p>

          {/* Floating emojis */}
          <div className="mt-16 flex flex-wrap justify-center gap-3 sm:gap-4">
            {floatingEmojis.map((emoji, i) => (
              <motion.span
                key={i}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-xl shadow-lg sm:h-14 sm:w-14 sm:text-2xl"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
                transition={{
                  opacity: { delay: 0.5 + i * 0.1, duration: 0.3 },
                  scale: { delay: 0.5 + i * 0.1, duration: 0.3 },
                  y: { duration: 3, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" },
                }}
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
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-muted-foreground"
          >
            <span className="text-xs font-medium">Scroll to explore</span>
            <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/50">
              <motion.div
                animate={{ y: [2, 14, 2] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mx-auto mt-1 h-2 w-1.5 rounded-full bg-primary"
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Section 2: Dashboard Mockup */}
      <section ref={productRef} className="relative px-6 py-32">
        <div className="mx-auto max-w-5xl">
          <motion.div
            style={{
              rotateX: productRotateX,
              scale: productScale,
              opacity: productOpacity,
            }}
            className="perspective-1000 preserve-3d"
          >
            <DeviceFrame
              imageSrc="/screenshots/dashboard-preview.jpg"
              imageAlt="Pretvia Dashboard Preview"
              animate={false}
              className="mx-auto max-w-4xl"
            />
          </motion.div>
        </div>
      </section>

      {/* Section 3: The Growth Tree */}
      <section
        ref={treeRef}
        className="relative min-h-screen flex items-center justify-center px-6 py-32 overflow-hidden"
      >
        <div className="relative">
          {/* Tree trunk and branches - stylized SVG */}
          <div className="relative w-[300px] h-[350px] md:w-[400px] md:h-[450px]">
            <svg
              viewBox="0 0 200 250"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Tree trunk */}
              <motion.path
                d="M100 250 L100 140 Q100 100 80 80 M100 140 Q100 100 120 80"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className="text-primary/70"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              {/* Left branches */}
              <motion.path
                d="M85 120 Q50 100 30 70 M75 100 Q45 85 25 110"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                className="text-primary/60"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
              />
              {/* Right branches */}
              <motion.path
                d="M115 120 Q150 100 170 70 M125 100 Q155 85 175 110"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                className="text-primary/60"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
              />
              {/* Top branches */}
              <motion.path
                d="M80 80 Q60 50 50 30 M120 80 Q140 50 150 30 M90 70 Q100 40 100 20 M110 70 Q100 40 100 20"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-primary/50"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
              />
            </svg>

            {/* Fruits with spring pop animation */}
            {treeFruits.map((fruit, i) => (
              <FruitWithLabel
                key={fruit.label}
                fruit={fruit}
                progress={fruitProgresses[i]}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: The Staircase of Logs */}
      <section
        ref={staircaseRef}
        className="relative min-h-[150vh] px-6 py-32"
      >
        <div className="sticky top-32 mx-auto max-w-4xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 text-center text-2xl font-bold text-foreground md:text-3xl"
          >
            Every minute stacks.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mb-16 text-center text-muted-foreground"
          >
            Every log becomes a step.
          </motion.p>

          {/* Staircase container */}
          <div className="relative h-[400px] flex items-end justify-center">
            {/* Stacked log cards */}
            <div className="relative">
              {trainingLogs.map((log, i) => (
                <StaircaseCard
                  key={i}
                  log={log}
                  index={i}
                  progress={cardProgresses[i]}
                />
              ))}
            </div>
          </div>

          {/* Confetti and Badge */}
          <AnimatePresence>
            {showConfetti && (
              <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                {Array.from({ length: 50 }).map((_, i) => (
                  <ConfettiParticle key={i} index={i} />
                ))}
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {badgeRevealed && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: 0.3,
                }}
                className="mt-12 flex justify-center"
              >
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-8 py-6">
                  <span className="text-4xl">🏆</span>
                  <span className="font-semibold text-primary text-lg">Moment Ready</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Section 5: Final Hook */}
      <section className="relative flex min-h-[70vh] items-center justify-center px-6 py-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <h2 className="text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
            <span className="text-muted-foreground/60">Pretvia:</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-[hsl(190,80%,50%)] bg-clip-text text-transparent">
              Be ready for your moment.
            </span>
          </h2>
        </motion.div>
      </section>

      {/* Section 6: CTA */}
      <section className="px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
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

// Fruit component with spring pop animation and label
function FruitWithLabel({
  fruit,
  progress,
}: {
  fruit: (typeof treeFruits)[0];
  progress: ReturnType<typeof useTransform>;
}) {
  const springProgress = useSpring(progress, { stiffness: 400, damping: 15 });
  const scale = useTransform(springProgress, [0, 1], [0, 1]);
  const opacity = useTransform(progress, [0, 0.5], [0, 1]);

  return (
    <motion.div
      style={{
        scale,
        opacity,
        position: "absolute",
        left: `calc(50% + ${fruit.position.x}px)`,
        top: `calc(40% + ${fruit.position.y}px)`,
        x: "-50%",
        y: "-50%",
      }}
      className="flex flex-col items-center gap-2"
    >
      <span className="text-4xl md:text-5xl drop-shadow-lg">{fruit.emoji}</span>
      <span className="whitespace-nowrap rounded-full bg-card/90 px-3 py-1 text-xs font-medium text-foreground shadow-md border border-border">
        {fruit.label}
      </span>
    </motion.div>
  );
}

// Staircase card component
function StaircaseCard({
  log,
  index,
  progress,
}: {
  log: (typeof trainingLogs)[0];
  index: number;
  progress: ReturnType<typeof useTransform>;
}) {
  const springProgress = useSpring(progress, { stiffness: 200, damping: 20 });
  
  // Cards fly in from alternating sides and stack
  const x = useTransform(
    springProgress,
    [0, 1],
    [index % 2 === 0 ? -300 : 300, 0]
  );
  const y = useTransform(springProgress, [0, 1], [100, 0]);
  const opacity = useTransform(progress, [0, 0.3], [0, 1]);
  const rotate = useTransform(
    springProgress,
    [0, 1],
    [index % 2 === 0 ? -15 : 15, 0]
  );

  return (
    <motion.div
      style={{
        x,
        y,
        opacity,
        rotate,
        position: "absolute",
        bottom: `${index * 60}px`,
        left: `${index * 15}px`,
        zIndex: index,
      }}
      className="w-[280px] md:w-[320px] rounded-xl border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-xl">
          {log.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{log.note}</p>
          <p className="text-xs text-muted-foreground">{log.date}</p>
        </div>
      </div>
    </motion.div>
  );
}
