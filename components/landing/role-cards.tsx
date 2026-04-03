"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  MessageCircle,
  Calendar,
  Filter,
  Megaphone,
  Heart,
  EyeOff,
  Smile,
  ClipboardCheck,
  Settings,
  Flame,
  PartyPopper,
  Shield,
  LayoutDashboard,
  Building2,
  TrendingUp,
  CreditCard,
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

// Mirrors features page — titles only, no descriptions
const roles: RoleData[] = [
  {
    id: "coach",
    title: "Coach",
    subtitle: "Lead your team with clarity",
    color: "primary",
    features: [
      { icon: Users, title: "Multiple Groups", description: "" },
      { icon: MessageCircle, title: "1-on-1 Feedback", description: "" },
      { icon: ClipboardCheck, title: "Session Check-Ins", description: "" },
      { icon: Settings, title: "Group Management", description: "" },
      { icon: Filter, title: "Smart Filtering", description: "" },
      { icon: Megaphone, title: "Announcements", description: "" },
    ],
  },
  {
    id: "athlete",
    title: "Athlete",
    subtitle: "Log sessions your way",
    color: "checkin",
    features: [
      { icon: Smile, title: "Easy Emoji Logging", description: "" },
      { icon: MessageCircle, title: "Coach Feedback", description: "" },
      { icon: EyeOff, title: "Private or Shared", description: "" },
      { icon: Flame, title: "Streaks", description: "" },
      { icon: PartyPopper, title: "Celebration", description: "" },
      { icon: Calendar, title: "Custom Training Schedule", description: "" },
    ],
  },
  {
    id: "guardian",
    title: "Guardian",
    subtitle: "Stay connected with their journey",
    color: "chart-3",
    features: [
      { icon: Calendar, title: "Emoji Calendar", description: "" },
      { icon: Heart, title: "Conversation Starters", description: "" },
      { icon: Shield, title: "Respectful Access", description: "" },
    ],
  },
  {
    id: "club",
    title: "Club",
    subtitle: "Run your entire organization from one place",
    color: "primary",
    features: [
      { icon: LayoutDashboard, title: "Club Dashboard", description: "" },
      { icon: Users, title: "Coach Management", description: "" },
      { icon: Building2, title: "Multi-Group Management", description: "" },
      { icon: Megaphone, title: "Club-Wide Announcements", description: "" },
      { icon: TrendingUp, title: "Activity Insights", description: "" },
      { icon: CreditCard, title: "Billing & Seats", description: "" },
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
                <h4 className="font-semibold text-foreground">{feature.title}</h4>
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
