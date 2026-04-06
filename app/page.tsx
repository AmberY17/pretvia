import type { Metadata } from "next"
import { pricingFlag } from "@/flags"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingFooter } from "@/components/landing/landing-footer"
import { HeroSection } from "@/components/landing/hero-section"
import { ProductSection } from "@/components/landing/product-section"
import { StaircaseSection } from "@/components/landing/staircase-section"
import { BuiltForRoleSection } from "@/components/landing/built-for-role-section"
import { FinalHookSection } from "@/components/landing/final-hook-section"
import { CtaSection } from "@/components/landing/cta-section"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: 'Pretvia — Emoji-Powered Training Logs for Athletes & Coaches',
  description:
    'Track your training with emoji-powered visual logs, custom tags, and share them with your fellow athletes. Built for athletes and coaches.',
  openGraph: {
    title: 'Pretvia — Emoji-Powered Training Logs',
    description:
      'Track your training with emoji-powered visual logs, custom tags, and share them with your fellow athletes.',
    url: 'https://pretvia.com',
  },
}

export default async function LandingPage() {
  const pricingPageVisible = await pricingFlag()

  const navLinks = [
    { href: "/features", label: "Features" },
    ...(pricingPageVisible ? [{ href: "/pricing", label: "Pricing" }] : []),
  ]

  return (
    <main className="min-h-screen">
      <LandingNav links={navLinks} />

      <HeroSection />
      <ProductSection />
      <StaircaseSection />
      <BuiltForRoleSection />
      <FinalHookSection />
      <CtaSection />

      <LandingFooter links={navLinks} />
    </main>
  )
}
