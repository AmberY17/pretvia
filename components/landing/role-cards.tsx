"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Users,
  MessageCircle,
  Calendar,
  Filter,
  Megaphone,
  Heart,
  EyeOff,
  Clock,
  Smile,
  CheckCircle,
  Shield,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface RoleData {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  features: Feature[];
}

const roles: RoleData[] = [
  {
    id: "coach",
    title: "Coach",
    subtitle: "Lead your team with clarity",
    color: "primary",
    features: [
      {
        icon: Users,
        title: "Multiple Groups",
        description: "Manage different training groups with separate rosters, schedules, and settings.",
      },
      {
        icon: MessageCircle,
        title: "1-on-1 Feedback",
        description: "Provide personalized feedback directly on each athlete's training logs.",
      },
      {
        icon: CheckCircle,
        title: "Attendance Tracking",
        description: "Create session check-ins and track who showed up with a visual progress bar.",
      },
      {
        icon: ClipboardList,
        title: "Group Management",
        description: "Assign roles, set training schedules, invite athletes, and manage guardians.",
      },
      {
        icon: Filter,
        title: "Smart Filtering",
        description: "Filter logs by athlete, date range, tags, or emojis to find exactly what you need.",
      },
      {
        icon: Megaphone,
        title: "Announcements",
        description: "Pin important updates that appear at the top of everyone's feed.",
      },
    ],
  },
  {
    id: "athlete",
    title: "Athlete",
    subtitle: "Log sessions your way",
    color: "checkin",
    features: [
      {
        icon: Smile,
        title: "Easy Emoji Logging",
        description: "Capture how your session felt with a single tap. No complicated forms.",
      },
      {
        icon: MessageCircle,
        title: "Coach Feedback",
        description: "Receive personalized insights from your coach directly on your logs.",
      },
      {
        icon: EyeOff,
        title: "Private or Shared",
        description: "Keep logs completely private, or share them with your coach for guidance.",
      },
      {
        icon: Clock,
        title: "Quick Check-ins",
        description: "Log sessions in seconds when your coach creates a check-in card.",
      },
    ],
  },
  {
    id: "guardian",
    title: "Guardian",
    subtitle: "Stay connected with their journey",
    color: "chart-3",
    features: [
      {
        icon: Calendar,
        title: "Emoji Calendar",
        description: "See your child's training sessions displayed as emojis on a monthly calendar.",
      },
      {
        icon: Heart,
        title: "Conversation Starters",
        description: "Each emoji tells a story. Ask them about that star or cloud they logged!",
      },
      {
        icon: Shield,
        title: "Respectful Access",
        description: "View training moods without reading private details. Trust builds together.",
      },
    ],
  },
];

export function RoleCards() {
  const [activeRole, setActiveRole] = useState<string>("coach");
  const activeData = roles.find((r) => r.id === activeRole) || roles[0];

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Role tabs */}
      <div className="flex justify-center gap-2 mb-10">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setActiveRole(role.id)}
            className={`relative px-6 py-3 text-sm font-medium rounded-full transition-colors ${
              activeRole === role.id
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {activeRole === role.id && (
              <motion.div
                layoutId="active-role-bg"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{role.title}</span>
          </button>
        ))}
      </div>

      {/* Active role content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeRole}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {activeData.title}
            </h3>
            <p className="text-muted-foreground">{activeData.subtitle}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeData.features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h4 className="mb-1.5 font-semibold text-foreground">
                  {feature.title}
                </h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* CTA */}
      <div className="mt-12 text-center">
        <Link href="/features">
          <Button variant="outline" className="gap-2">
            See all features in detail
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Compact role preview for hero section
export function RolePreviewCards() {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {roles.map((role, i) => (
        <motion.div
          key={role.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm"
        >
          <span className="font-medium text-foreground">{role.title}</span>
          <span className="text-muted-foreground">
            {role.features.length} features
          </span>
        </motion.div>
      ))}
    </div>
  );
}
