"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ChartNoAxesCombined,
  Smile,
  Users,
  MessageCircle,
  EyeOff,
  Filter,
  Megaphone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { DeviceFrame } from "@/components/landing/device-frame";
import { RoleCards } from "@/components/landing/role-cards";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const floatingEmojis = [
  "\u{1F93A}", // Fencing
  "\u{1F4A6}", // Sweat
  "\u{1F525}", // Fire
  "\u{1F344}", // Mushroom
  "\u2B50\uFE0F", // Star
  "\u2601\uFE0F", // Cloud
];

const scrollFeatures = [
  {
    icon: Smile,
    title: "Visual Emoji Logs",
    description:
      "Log your training sessions in seconds with expressive emoji indicators. No complex forms, just tap to capture how your workout felt.",
  },
  {
    icon: Users,
    title: "Session Check-Ins",
    description:
      "Coaches create check-in cards for training sessions. Athletes log with a single tap, and progress updates in real time.",
  },
  {
    icon: MessageCircle,
    title: "Private 1-on-1 Feedback",
    description:
      "Every log entry becomes a conversation between you and your coach. Personalized insights where they matter most.",
  },
  {
    icon: EyeOff,
    title: "Your Privacy, Your Choice",
    description:
      "Share logs with your coach for feedback, or keep them completely private. You control who sees your training data.",
  },
  {
    icon: Filter,
    title: "Smart Filtering",
    description:
      "Instantly find what matters with powerful filtering by tags, dates, and athletes. Your data is always one click away.",
  },
  {
    icon: Megaphone,
    title: "Coach Announcements",
    description:
      "Keep your team informed with pinned announcements that appear at the top of everyone's feed.",
  },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  const productRef = useRef<HTMLElement>(null);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const { scrollYProgress: productProgress } = useScroll({
    target: productRef,
    offset: ["start end", "end start"],
  });

  const heroOpacity = useTransform(heroProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(heroProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(heroProgress, [0, 0.5], [0, 100]);

  const productRotateX = useTransform(productProgress, [0, 0.4], [15, 0]);
  const productScale = useTransform(productProgress, [0, 0.4], [0.85, 1]);
  const productOpacity = useTransform(productProgress, [0, 0.25], [0, 1]);

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

      {/* Hero Section - Full viewport with parallax */}
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
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
        >
          <motion.div
            variants={fadeUp}
            custom={0}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            Built for athletes and coaches
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-balance text-5xl font-bold leading-tight tracking-tight text-foreground md:text-7xl"
          >
            {"Log Your Training, "}
            <span className="bg-gradient-to-r from-primary to-[hsl(190,80%,50%)] bg-clip-text text-transparent">
              Visually.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground"
          >
            Emoji-first training logs that make tracking sessions intuitive.
            <br />
            Tag, filter, and feedback &mdash; all in one clean dashboard.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="mt-10 flex gap-4">
            <Link href="/auth">
              <Button
                size="lg"
                className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90"
              >
                Start Training
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          {/* Floating emojis */}
          <motion.div
            variants={fadeUp}
            custom={4}
            className="mt-16 flex flex-wrap justify-center gap-3 sm:gap-4"
          >
            {floatingEmojis.map((emoji, i) => (
              <motion.span
                key={i}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-xl shadow-lg sm:h-14 sm:w-14 sm:text-2xl"
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 3,
                  delay: i * 0.3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                {emoji}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className="flex flex-col items-center gap-2 text-muted-foreground"
          >
            <span className="text-xs">Scroll to explore</span>
            <div className="h-6 w-4 rounded-full border-2 border-muted-foreground/50">
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                className="mx-auto mt-1 h-1.5 w-1 rounded-full bg-muted-foreground/50"
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Product Preview Section */}
      <section
        ref={productRef}
        className="relative px-6 py-32"
      >
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
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 text-center text-sm text-muted-foreground"
          >
            Your dashboard. Clean, focused, emoji-powered.
          </motion.p>
        </div>
      </section>

      {/* Scrollytelling Features Section */}
      <section className="relative border-t border-border bg-card/30 py-32">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="mb-20 text-center"
          >
            <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
              Everything you need to track effectively
            </h2>
            <p className="mt-4 text-muted-foreground">
              Simple tools, powerful results.
            </p>
          </motion.div>

          {/* Scrolling feature cards */}
          <div className="space-y-24">
            {scrollFeatures.map((feature, i) => (
              <FeatureScrollCard
                key={feature.title}
                feature={feature}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Role Showcase Section */}
      <section className="border-t border-border px-6 py-32">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
              Built for every role
            </h2>
            <p className="mt-4 text-muted-foreground">
              Whether you coach, train, or support from the sidelines.
            </p>
          </motion.div>

          <RoleCards />
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-12 text-center"
        >
          <h2 className="text-balance text-2xl font-bold text-foreground md:text-3xl">
            Ready to transform your training logs?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Create your free account and start logging in under a minute.
          </p>
          <Link href="/auth" className="mt-8 inline-block">
            <Button
              size="lg"
              className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
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

// Feature card that animates on scroll
function FeatureScrollCard({
  feature,
  index,
}: {
  feature: (typeof scrollFeatures)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.2, 1, 1]);
  const x = useTransform(
    scrollYProgress,
    [0, 1],
    [index % 2 === 0 ? -40 : 40, 0]
  );
  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);

  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      style={{ opacity, x, scale }}
      className={`flex flex-col items-center gap-8 md:flex-row ${
        index % 2 === 1 ? "md:flex-row-reverse" : ""
      }`}
    >
      {/* Icon container */}
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-primary/10 md:h-32 md:w-32">
        <Icon className="h-10 w-10 text-primary md:h-12 md:w-12" />
      </div>

      {/* Content */}
      <div className="flex-1 text-center md:text-left">
        <h3 className="mb-3 text-xl font-semibold text-foreground md:text-2xl">
          {feature.title}
        </h3>
        <p className="leading-relaxed text-muted-foreground">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}
