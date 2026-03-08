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
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ScreenshotGallery } from "@/components/landing/screenshot-gallery";

// Feature data structure
interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  details?: string[];
}

interface RoleSection {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
  screenshots: {
    src: string;
    alt: string;
    title: string;
    description?: string;
  }[];
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
      },
    ],
    screenshots: [
      {
        src: "/screenshots/coach-dashboard.jpg",
        alt: "Coach Dashboard",
        title: "Coach Dashboard",
        description: "Overview of all your groups and recent activity",
      },
      {
        src: "/screenshots/group-management.jpg",
        alt: "Group Management",
        title: "Group Management",
        description: "Manage athletes, roles, and training schedules",
      },
      {
        src: "/screenshots/checkin-session.jpg",
        alt: "Check-in Session",
        title: "Session Check-Ins",
        description: "Track attendance with visual progress",
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
      },
      {
        icon: Clock,
        title: "Quick Check-Ins",
        description:
          "When your coach creates a session, log your attendance with a single tap.",
        details: [
          "Session notifications",
          "One-tap check-in",
          "Automatic date/time",
          "Seamless flow to logging",
        ],
      },
    ],
    screenshots: [
      {
        src: "/screenshots/athlete-log.jpg",
        alt: "Athlete Logging",
        title: "Easy Logging",
        description: "Log your session with emojis and optional notes",
      },
      {
        src: "/screenshots/athlete-feed.jpg",
        alt: "Athlete Feed",
        title: "Your Training Feed",
        description: "See your logs and coach feedback in one place",
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
    screenshots: [
      {
        src: "/screenshots/guardian-calendar.jpg",
        alt: "Guardian Calendar",
        title: "Emoji Calendar",
        description: "See training moods at a glance",
      },
    ],
  },
];

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState<string>("coach");
  const activeSection = roleSections.find((s) => s.id === activeTab) || roleSections[0];

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
            <ThemeSwitcher />
            <Link href="/auth">
              <Button variant="ghost-secondary" size="sm" className="gap-2">
                Sign In
              </Button>
            </Link>
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
            Explore how Pretvia helps coaches, athletes, and guardians work together.
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
              <span className="relative z-10">{section.title.replace("For ", "")}</span>
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

            {/* Features Grid */}
            <div className="mb-20 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeSection.features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                  {feature.details && (
                    <ul className="space-y-1.5">
                      {feature.details.map((detail) => (
                        <li
                          key={detail}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/50" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Screenshots Section */}
            {activeSection.screenshots.length > 0 && (
              <div>
                <h3 className="mb-8 text-center text-xl font-semibold text-foreground">
                  See it in action
                </h3>
                <ScreenshotGallery
                  screenshots={activeSection.screenshots}
                  columns={activeSection.screenshots.length === 1 ? 2 : 3}
                />
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Click any screenshot to view full size
                </p>
              </div>
            )}
          </div>
        </motion.section>
      </AnimatePresence>

      {/* CTA Section */}
      <section className="border-t border-border px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-12 text-center"
        >
          <h2 className="text-balance text-2xl font-bold text-foreground md:text-3xl">
            Ready to get started?
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
