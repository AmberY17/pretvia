import type { Metadata } from "next"
import { getDb } from "@/lib/mongodb"
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
  const db = await getDb()
  const siteSettings = await db.collection("siteSettings").findOne({ key: "site" })
  const pricingPageVisible = siteSettings?.pricingPageVisible ?? false

  const pricingLink = pricingPageVisible
    ? { href: "/pricing", label: "Pricing" }
    : undefined

  return (
    <main className="min-h-screen">
      <LandingNav
        primaryLink={{ href: "/features", label: "Features" }}
        secondaryLink={pricingLink}
      />

      <HeroSection />
      <ProductSection />
      <StaircaseSection />
      <BuiltForRoleSection />
      <FinalHookSection />
      <CtaSection />

      <LandingFooter
        footerLink={{ href: "/features", label: "Features" }}
        secondaryLink={pricingLink}
      />
    </main>
  )
}
