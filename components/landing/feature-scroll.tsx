"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Smile,
  Users,
  MessageCircle,
  EyeOff,
  Filter,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const features: FeatureItem[] = [
  {
    icon: Smile,
    title: "Visual Emoji Logs",
    description:
      "Log your training sessions in seconds with expressive emoji indicators. No complex forms, just tap to capture how your workout felt.",
    color: "from-primary/20 to-primary/5",
  },
  {
    icon: Users,
    title: "Session Check-Ins",
    description:
      "Coaches create check-in cards for training sessions. Athletes log with a single tap, and progress updates in real time.",
    color: "from-checkin/20 to-checkin/5",
  },
  {
    icon: MessageCircle,
    title: "Private 1-on-1 Feedback",
    description:
      "Every log entry becomes a conversation between you and your coach. Personalized insights where they matter most.",
    color: "from-chart-2/20 to-chart-2/5",
  },
  {
    icon: EyeOff,
    title: "Your Privacy, Your Choice",
    description:
      "Share logs with your coach for feedback, or keep them completely private. You control who sees your training data.",
    color: "from-chart-4/20 to-chart-4/5",
  },
  {
    icon: Filter,
    title: "Smart Filtering",
    description:
      "Instantly find what matters with powerful filtering by tags, dates, and athletes. Your data is always one click away.",
    color: "from-chart-3/20 to-chart-3/5",
  },
  {
    icon: Megaphone,
    title: "Coach Announcements",
    description:
      "Keep your team informed with pinned announcements that appear at the top of everyone's feed.",
    color: "from-primary/20 to-primary/5",
  },
];

export function FeatureScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <div ref={containerRef} className="relative">
      {/* Sticky header */}
      <div className="sticky top-20 z-10 mb-8 bg-background/80 py-4 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            Everything you need to track effectively
          </h2>
          <p className="mt-2 text-muted-foreground">
            Simple tools, powerful results.
          </p>
        </div>
      </div>

      {/* Scrolling features */}
      <div className="mx-auto max-w-5xl space-y-32 px-6 pb-32">
        {features.map((feature, index) => (
          <FeatureScrollItem
            key={feature.title}
            feature={feature}
            index={index}
            total={features.length}
            progress={scrollYProgress}
          />
        ))}
      </div>

      {/* Progress indicator */}
      <div className="fixed right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
        {features.map((_, index) => (
          <ProgressDot
            key={index}
            index={index}
            total={features.length}
            progress={scrollYProgress}
          />
        ))}
      </div>
    </div>
  );
}

function FeatureScrollItem({
  feature,
  index,
}: {
  feature: FeatureItem;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 1, 1]);
  const x = useTransform(
    scrollYProgress,
    [0, 1],
    [index % 2 === 0 ? -50 : 50, 0]
  );
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity, x, scale }}
      className={`flex items-center gap-8 ${
        index % 2 === 0 ? "flex-row" : "flex-row-reverse"
      }`}
    >
      {/* Icon */}
      <div
        className={`hidden shrink-0 md:flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br ${feature.color}`}
      >
        <feature.icon className="h-12 w-12 text-primary" />
      </div>

      {/* Content */}
      <div className="flex-1">
        <div
          className={`md:hidden mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color}`}
        >
          <feature.icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="mb-3 text-xl font-semibold text-foreground md:text-2xl">
          {feature.title}
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}

function ProgressDot({
  index,
  total,
  progress,
}: {
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const start = index / total;
  const end = (index + 1) / total;

  const scale = useTransform(progress, [start, (start + end) / 2, end], [1, 1.5, 1]);
  const opacity = useTransform(
    progress,
    [start, (start + end) / 2, end],
    [0.3, 1, 0.3]
  );

  return (
    <motion.div
      style={{ scale, opacity }}
      className="h-2 w-2 rounded-full bg-primary"
    />
  );
}
