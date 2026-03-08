"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  roleSections,
  type FeatureScreenshot,
} from "@/components/landing/features-data";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { FeaturesHeroSection } from "@/components/landing/features-hero-section";
import { FeaturesRoleTabs } from "@/components/landing/features-role-tabs";
import { FeaturesSectionContent } from "@/components/landing/features-section-content";
import { ScreenshotLightbox } from "@/components/landing/screenshot-lightbox";
import { FeaturesCtaSection } from "@/components/landing/features-cta-section";

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState<string>("coach");
  const [lightboxScreenshot, setLightboxScreenshot] =
    useState<FeatureScreenshot | null>(null);
  const activeSection =
    roleSections.find((s) => s.id === activeTab) || roleSections[0];

  return (
    <main className="min-h-screen">
      <LandingNav primaryLink={{ href: "/", label: "Home" }} />

      <FeaturesHeroSection />
      <FeaturesRoleTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="wait">
        <motion.section
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="px-6 py-16"
        >
          <FeaturesSectionContent
            activeSection={activeSection}
            onScreenshotClick={setLightboxScreenshot}
          />
        </motion.section>
      </AnimatePresence>

      <ScreenshotLightbox
        screenshot={lightboxScreenshot}
        onClose={() => setLightboxScreenshot(null)}
      />

      <FeaturesCtaSection />

      <LandingFooter footerLink={{ href: "/", label: "Home" }} />
    </main>
  );
}
