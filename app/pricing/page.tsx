import { notFound } from "next/navigation"
import { pricingFlag } from "@/flags"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingFooter } from "@/components/landing/landing-footer"
import { PricingSection } from "@/components/landing/pricing-section"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Pricing — Pretvia",
  description:
    "Squad is free forever. Upgrade to Varsity for unlimited groups, or Club for your whole organization.",
  openGraph: {
    title: "Pricing — Pretvia",
    description:
      "Squad is free forever. Upgrade to Varsity for unlimited groups, or Club for your whole organization.",
    url: "https://pretvia.com/pricing",
  },
}

export default async function PricingPage() {
  const visible = await pricingFlag()

  if (!visible) {
    notFound()
  }

  return (
    <main className="min-h-screen">
      <LandingNav />

      <section className="flex flex-col items-center px-6 pb-24 pt-32">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Simple, honest pricing
          </h1>
          <p className="text-lg text-muted-foreground">
            Start free. Scale when you&apos;re ready.
          </p>
        </div>
        <PricingSection />
      </section>

      <LandingFooter
        links={[
          { href: "/features", label: "Features" },
          { href: "/pricing", label: "Pricing" },
        ]}
      />
    </main>
  )
}
