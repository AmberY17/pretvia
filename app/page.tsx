"use client";

import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { HeroSection } from "@/components/landing/hero-section";
import { ProductSection } from "@/components/landing/product-section";
import { GrowthTreeSection } from "@/components/landing/growth-tree-section";
import { StaircaseSection } from "@/components/landing/staircase-section";
import { BuiltForRoleSection } from "@/components/landing/built-for-role-section";
import { FinalHookSection } from "@/components/landing/final-hook-section";
import { CtaSection } from "@/components/landing/cta-section";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <LandingNav primaryLink={{ href: "/features", label: "Features" }} />

      <HeroSection />
      <ProductSection />
      <GrowthTreeSection />
      <StaircaseSection />
      <BuiltForRoleSection />
      <FinalHookSection />
      <CtaSection />

      <LandingFooter footerLink={{ href: "/features", label: "Features" }} />
    </main>
  );
}
