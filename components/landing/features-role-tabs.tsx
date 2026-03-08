"use client";

import { motion } from "framer-motion";
import { roleSections } from "@/components/landing/features-data";

export function FeaturesRoleTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <section className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl justify-center gap-2 px-6 py-4">
        {roleSections.map((section) => (
          <button
            key={section.id}
            onClick={() => onTabChange(section.id)}
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
  );
}
