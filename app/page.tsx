"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  EyeOff,
  Smile,
  Users,
  MessageCircle,
  Filter,
  Megaphone,
  ChartNoAxesCombined,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const features = [
  {
    icon: Smile,
    title: "Visual Emoji Logs",
    description:
      "Log your training sessions in seconds with expressive emoji indicators. No complex forms—just tap an emoji to capture how your workout felt, making adherence tracking intuitive and genuinely enjoyable.",
  },
  {
    icon: Users,
    title: "Session Check-Ins",
    description:
      "Coaches create check-in cards for training sessions. Athletes log their sessions with a single tap, and the whole group sees progress in real time.",
  },
  {
    icon: MessageCircle,
    title: "Private 1-on-1 Feedback",
    description:
      "Receive personalized coaching directly on your logs. Every entry becomes a private conversation between you and your coach.",
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
      "Instantly find what matters with powerful filtering by tags, dates, and athletes. Whether you're tracking specific training modalities or reviewing a single athlete's journey, your data is always just one click away.",
  },
  {
    icon: Megaphone,
    title: "Coach Announcements",
    description:
      "Keep your team informed with pinned announcements that appear at the top of everyone's feed. Share updates, motivation, or important reminders.",
  },
];

const floatingEmojis = [
  "\u{1F93A}", // Fencing
  "\u{1F4A6}", // Sweat (Drops)
  "\u{1F525}", // Fire
  "\u{1F344}", // Mushroom
  "\u2B50\uFE0F", // Star
  "\u2601\uFE0F", // Cloud
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <ChartNoAxesCombined className="h-5 w-5 text-primary" />
            <span className="font-brand text-lg text-foreground">Pretvia</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center sm:py-36">
        {/* Gradient orb background */}
        <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
          <div className="h-[500px] w-[700px] rounded-full bg-primary/10 blur-3xl" />
        </div>

        <motion.div
          className="mx-auto max-w-3xl"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.div variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground">
              Built for athletes and coaches
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="mt-6 font-brand text-5xl leading-tight tracking-tight text-foreground text-balance sm:text-7xl"
          >
            {"Log Your Training, "}
            <span className="text-primary">Visually.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-6 text-lg leading-relaxed text-muted-foreground text-balance"
          >
            Emoji-first training logs that make tracking sessions intuitive.
            <br />
            Tag, filter, and feedback -- all in one clean dashboard.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" className="gap-2" asChild>
              <Link href="/sign-up">
                Start Training
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Floating emojis */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          {floatingEmojis.map((emoji, i) => (
            <motion.span
              key={i}
              className="absolute text-3xl select-none"
              style={{
                left: `${10 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
              animate={{
                y: [0, -16, 0],
                rotate: [-4, 4, -4],
              }}
              transition={{
                duration: 4 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {emoji}
            </motion.span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <motion.div
          className="mb-14 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-brand text-3xl text-foreground text-balance sm:text-4xl">
            Everything you need to track effectively
          </h2>
          <p className="mt-3 text-muted-foreground text-balance">
            Simple tools, powerful results.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <motion.div
          className="rounded-3xl border border-border bg-card p-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-brand text-3xl text-foreground text-balance sm:text-4xl">
            Ready to transform your training logs?
          </h2>
          <p className="mt-4 text-muted-foreground text-balance">
            Create your free account and start logging in under a minute.
          </p>
          <Button size="lg" className="mt-8 gap-2" asChild>
            <Link href="/sign-up">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <ChartNoAxesCombined className="h-4 w-4 text-primary" />
            <span className="font-brand text-sm text-foreground">Pretvia</span>
          </div>
          <p className="text-xs text-muted-foreground">
            En garde, Pretvia, Allez!
          </p>
        </div>
      </footer>
    </div>
  );
}
