"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Users,
  MessageCircle,
  ClipboardCheck,
  Settings,
  Filter,
  Megaphone,
  Smile,
  EyeOff,
  Clock,
  Calendar,
  Heart,
  Shield,
  ChartNoAxesCombined,
  X,
  Maximize2,
  Flame,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";

// Feature data structure
interface FeatureScreenshot {
  src: string;
  alt: string;
  title: string;
  description?: string;
}

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  details?: string[];
  screenshot?: FeatureScreenshot;
}

interface RoleSection {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
}

const roleSections: RoleSection[] = [
  {
    id: "coach",
    title: "For Coaches",
    subtitle: "Lead your team with clarity and precision",
    description:
      "Manage multiple groups, track attendance, provide personalized feedback, and keep everyone informed with powerful yet simple tools.",
    features: [
      {
        icon: Users,
        title: "Multiple Groups",
        description:
          "Organize athletes into separate training groups with individual rosters, schedules, and settings.",
        details: [
          "Create unlimited training groups",
          "Set group-specific training schedules",
          "Manage roles and permissions per group",
          "Transfer athletes between groups easily",
        ],
        screenshot: {
          src: "/screenshots/coach-group-switcher.png",
          alt: "Multiple Groups - Group switcher",
          title: "Multiple Groups",
          description: "Switch between training groups and see overview",
        },
      },
      {
        icon: MessageCircle,
        title: "1-on-1 Feedback",
        description:
          "Provide personalized coaching feedback directly on each athlete's training logs.",
        details: [
          "Comment on individual log entries",
          "Private conversations with each athlete",
          "Track feedback history over time",
          "Build stronger coach-athlete relationships",
        ],
        screenshot: {
          src: "/screenshots/coach-1-on-1.png",
          alt: "1-on-1 Feedback",
          title: "1-on-1 Feedback",
          description: "Provide personalized coaching feedback on training logs",
        },
      },
      {
        icon: ClipboardCheck,
        title: "Session Check-Ins",
        description:
          "Create check-in cards for training sessions and track attendance in real time.",
        details: [
          "One-tap session creation",
          "Visual progress bar for attendance",
          "Automatic reminders for athletes",
          "Historical attendance tracking",
        ],
        screenshot: {
          src: "/screenshots/coach-check-in.png",
          alt: "Session Check-Ins",
          title: "Session Check-Ins",
          description: "Track attendance with visual progress",
        },
      },
      {
        icon: Settings,
        title: "Group Management",
        description:
          "Full control over your group settings, roles, training schedules, and athlete management.",
        details: [
          "Custom athlete roles (e.g., Captain, Senior)",
          "Training schedule templates",
          "Invite athletes via email",
          "Guardian/parent linking",
        ],
        screenshot: {
          src: "/screenshots/coach-manage-group.png",
          alt: "Group Management",
          title: "Group Management",
          description: "Manage athletes, roles, and training schedules",
        },
      },
      {
        icon: Filter,
        title: "Smart Filtering",
        description:
          "Find exactly what you need with powerful filtering by athlete, date, tags, or mood.",
        details: [
          "Filter by athlete name",
          "Date range selection",
          "Tag-based filtering",
          "Emoji mood filtering",
        ],
        screenshot: {
          src: "/screenshots/coach-filters-expanded.png",
          alt: "Smart Filtering",
          title: "Smart Filtering",
          description: "Filter by athlete, date, tags, or mood",
        },
      },
      {
        icon: Megaphone,
        title: "Announcements",
        description:
          "Pin important updates that appear prominently at the top of everyone's feed.",
        details: [
          "Pinned announcement cards",
          "Visible to all group members",
          "Easy create and remove",
          "Keep team informed instantly",
        ],
        screenshot: {
          src: "/screenshots/coach-announcement.png",
          alt: "Announcements",
          title: "Announcements",
          description: "Pin important updates at the top of the feed",
        },
      },
    ],
  },
  {
    id: "athlete",
    title: "For Athletes",
    subtitle: "Log sessions your way, in seconds",
    description:
      "Simple emoji-based logging that captures how you feel without complex forms. Keep logs private or share them with your coach.",
    features: [
      {
        icon: Smile,
        title: "Easy Emoji Logging",
        description:
          "Capture how your session felt with a single tap. No complicated forms required.",
        details: [
          "One-tap emoji selection",
          "Optional notes and details",
          "Custom tags for categorization",
          "Quick and intuitive interface",
        ],
        screenshot: {
          src: "/screenshots/athlete-log-emoji.png",
          alt: "Easy Emoji Logging",
          title: "Easy Emoji Logging",
          description: "Log your session with emojis and optional notes",
        },
      },
      {
        icon: MessageCircle,
        title: "Coach Feedback",
        description:
          "Receive personalized insights and encouragement from your coach on your logs.",
        details: [
          "Direct comments from coach",
          "Two-way conversation",
          "Build on your progress",
          "Notification when coach responds",
        ],
        screenshot: {
          src: "/screenshots/coach-1-on-1-purple.png",
          alt: "Coach Feedback",
          title: "Coach Feedback",
          description: "See your logs and coach feedback in one place",
        },
      },
      {
        icon: EyeOff,
        title: "Private or Shared",
        description:
          "You control your data. Keep logs completely private, or share them for coaching.",
        details: [
          "Private by default option",
          "Share specific logs",
          "Coach sees only what you allow",
          "Full privacy control",
        ],
        screenshot: {
          src: "/screenshots/athlete-visibility.png",
          alt: "Private or Shared",
          title: "Private or Shared",
          description: "Control log visibility and privacy",
        },
      },
      {
        icon: Flame,
        title: "Streaks",
        description:
          "Build consistency with visual streak tracking. See how many sessions you've logged in a row and stay motivated.",
        details: [
          "Visual streak counter",
          "Track consecutive training days",
          "Stay motivated to keep showing up",
          "Celebrate your consistency",
        ],
        screenshot: {
          src: "/screenshots/athlete-streaks.png",
          alt: "Streaks",
          title: "Streaks",
          description: "Track your consecutive training days",
        },
      },
      {
        icon: PartyPopper,
        title: "Celebration",
        description:
          "Moments worth celebrating. Get a little confetti and recognition when you hit milestones or keep your streak alive.",
        details: [
          "Confetti when you hit milestones",
          "Moment Ready when fully prepared",
          "Recognition for your hard work",
          "Feel the win",
        ],
        screenshot: {
          src: "/screenshots/athlete-celebration.png",
          alt: "Celebration",
          title: "Celebration",
          description: "Celebrate milestones and achievements",
        },
      },
      {
        icon: Calendar,
        title: "Custom Training Schedule",
        description:
          "Set your own training days and times. Plan when you train so you stay on track and never miss a session.",
        details: [
          "Define your weekly schedule",
          "Flexible days and times",
          "See when you're due to log",
          "Works with or without coach sessions",
        ],
        screenshot: {
          src: "/screenshots/athlete-custom-schedule.png",
          alt: "Custom Training Schedule",
          title: "Custom Training Schedule",
          description: "Plan your training days and times",
        },
      },
    ],
  },
  {
    id: "guardian",
    title: "For Guardians",
    subtitle: "Stay connected with their journey",
    description:
      "See your child's training moods on a calendar view without invading their privacy. Start meaningful conversations about their day.",
    features: [
      {
        icon: Calendar,
        title: "Emoji Calendar",
        description:
          "View your child's training sessions displayed as emojis on a clean monthly or weekly calendar.",
        details: [
          "Month and week views",
          "Color-coded by mood",
          "Attendance tracking",
          "Multiple children support",
        ],
        screenshot: {
          src: "/screenshots/parent-month.png",
          alt: "Emoji Calendar",
          title: "Emoji Calendar",
          description: "See training moods at a glance",
        },
      },
      {
        icon: Heart,
        title: "Conversation Starters",
        description:
          "Each emoji tells a story. Use them to ask about training in a natural, supportive way.",
        details: [
          "See mood trends over time",
          "Natural talking points",
          "Celebrate good days",
          "Support tough sessions",
        ],
        screenshot: {
          src: "/screenshots/parent-week-purple.png",
          alt: "Conversation Starters",
          title: "Conversation Starters",
          description: "Week view for natural talking points",
        },
      },
      {
        icon: Shield,
        title: "Respectful Access",
        description:
          "View training moods without reading private details. Trust builds together.",
        details: [
          "Emoji-only visibility",
          "No private notes access",
          "Respects athlete privacy",
          "Coach-controlled linking",
        ],
      },
    ],
  },
];

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState<string>("coach");
  const [lightboxScreenshot, setLightboxScreenshot] =
    useState<FeatureScreenshot | null>(null);
  const activeSection =
    roleSections.find((s) => s.id === activeTab) || roleSections[0];

  return (
    <main className="min-h-screen">
      {/* Nav */}
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
            <Link href="/">
              <Button variant="ghost" size="sm">
                Home
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

      {/* Hero */}
      <section className="px-6 pt-32 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl"
        >
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Features for{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(190,80%,50%)] bg-clip-text text-transparent">
              Everyone
            </span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Explore how Pretvia helps coaches, athletes, and guardians work
            together.
          </p>
        </motion.div>
      </section>

      {/* Role Tabs */}
      <section className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl justify-center gap-2 px-6 py-4">
          {roleSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={`relative rounded-full px-6 py-2.5 text-sm font-medium transition-colors ${
                activeTab === section.id
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {activeTab === section.id && (
                <motion.div
                  layoutId="active-tab-bg"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">
                {section.title.replace("For ", "")}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Active Section Content */}
      <AnimatePresence mode="wait">
        <motion.section
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="px-6 py-16"
        >
          <div className="mx-auto max-w-6xl">
            {/* Section Header */}
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                {activeSection.title}
              </h2>
              <p className="mt-2 text-lg font-medium text-primary">
                {activeSection.subtitle}
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                {activeSection.description}
              </p>
            </div>

            {/* Feature cards — elongated, alternating left/right */}
            <div className="space-y-12 md:space-y-20">
              {activeSection.features.map((feature, i) => {
                const alignRight = feature.screenshot && i % 2 === 1;
                return (
                  <motion.article
                    key={feature.title}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`flex flex-col gap-8 md:flex-row md:items-center md:gap-12 ${
                      alignRight ? "md:flex-row-reverse" : ""
                    } ${!feature.screenshot ? "md:max-w-2xl" : ""}`}
                  >
                    <div
                      className={`flex-1 ${feature.screenshot ? "md:flex-[1.2]" : ""} ${
                        alignRight ? "md:text-right" : ""
                      }`}
                    >
                      <div
                        className={`mb-4 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ${
                          alignRight ? "md:ml-auto" : ""
                        }`}
                      >
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <h3 className="mb-3 text-xl font-semibold text-foreground md:text-2xl">
                        {feature.title}
                      </h3>
                      <p className="mb-4 text-muted-foreground md:text-base">
                        {feature.description}
                      </p>
                      {feature.details && (
                        <ul
                          className={`space-y-2 ${
                            alignRight ? "md:flex md:flex-col md:items-end" : ""
                          }`}
                        >
                          {feature.details.map((detail) => (
                            <li
                              key={detail}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {feature.screenshot ? (
                      <div className="flex-1 md:flex-[0.9]">
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxScreenshot(feature.screenshot!)
                          }
                          className="group relative block w-full overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <div className="relative aspect-video">
                            <Image
                              src={feature.screenshot.src}
                              alt={feature.screenshot.alt}
                              fill
                              sizes="(max-width: 768px) 100vw, 45vw"
                              className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-background/0 transition-colors group-hover:bg-background/10">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                <Maximize2 className="h-5 w-5" />
                              </span>
                            </div>
                          </div>
                          <div className="border-t border-border bg-card/50 px-4 py-3">
                            <p className="text-sm font-medium text-foreground">
                              {feature.screenshot.title}
                            </p>
                            {feature.screenshot.description && (
                              <p className="text-xs text-muted-foreground">
                                {feature.screenshot.description}
                              </p>
                            )}
                          </div>
                        </button>
                      </div>
                    ) : null}
                  </motion.article>
                );
              })}
            </div>

            {/* Lightbox for screenshot full-size view */}
            <AnimatePresence>
              {lightboxScreenshot && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-xl"
                  onClick={() => setLightboxScreenshot(null)}
                >
                  <button
                    type="button"
                    onClick={() => setLightboxScreenshot(null)}
                    className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex h-8 items-center gap-1.5 border-b border-border bg-secondary/50 px-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                      <div className="h-2.5 w-2.5 rounded-full bg-checkin/60" />
                      <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                    </div>
                    <div className="relative">
                      <Image
                        src={lightboxScreenshot.src}
                        alt={lightboxScreenshot.alt}
                        width={1280}
                        height={720}
                        className="h-auto max-h-[calc(85vh-80px)] w-auto object-contain"
                      />
                    </div>
                    <div className="border-t border-border bg-card p-4">
                      <p className="font-medium text-foreground">
                        {lightboxScreenshot.title}
                      </p>
                      {lightboxScreenshot.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {lightboxScreenshot.description}
                        </p>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </AnimatePresence>

      {/* CTA Section */}
      <section className="border-t border-border px-6 py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex justify-center"
        >
          <Link href="/auth">
            <Button
              size="lg"
              className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90"
            >
              Get started for free
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
              href="/"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
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
