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
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">
                TL
              </span>
            </div>
            <span className="text-lg font-bold text-foreground">Prets</span>
          </Link>
          <Link href="/auth">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 pt-32 pb-20">
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
            Tag, filter, and feedback -- all in one clean dashboard.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="mt-10 flex gap-4">
            <Link href="/auth">
              <Button
                size="lg"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8"
              >
                Start Training
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          {/* Floating emojis */}
          <motion.div variants={fadeUp} custom={4} className="mt-16 flex gap-4">
            {floatingEmojis.map((emoji, i) => (
              <motion.span
                key={i}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-2xl shadow-lg"
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
      </section>

      {/* Features */}
      <section className="relative border-t border-border bg-card/50 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
              Everything you need to track effectively
            </h2>
            <p className="mt-4 text-muted-foreground">
              Simple tools, powerful results.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  delay: i * 0.15,
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group relative rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/30"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
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
          <Link href="/auth" className="inline-block mt-8">
            <Button
              size="lg"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8"
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
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <span className="text-xs font-bold text-primary-foreground">
                TL
              </span>
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Prets
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ChartNoAxesCombined className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              En garde, Prets, Allez!
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
