import { notFound } from "next/navigation"
import Link from "next/link"
import { getDb } from "@/lib/mongodb"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingFooter } from "@/components/landing/landing-footer"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Pricing — Pretvia",
}

export default async function PricingPage() {
  const db = await getDb()
  const siteSettings = await db.collection("siteSettings").findOne({ key: "site" })

  if (!siteSettings?.pricingPageVisible) {
    notFound()
  }

  return (
    <main className="min-h-screen">
      <LandingNav primaryLink={{ href: "/features", label: "Features" }} />

      <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Early Access
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Free during beta
          </h1>
          <p className="mb-8 text-lg text-muted-foreground">
            Pretvia is free while we&apos;re in early access. Get full access to
            all features — no credit card required.
          </p>
          <Link href="/auth">
            <Button size="lg" className="px-8">
              Get started free
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Pricing will be announced before the end of beta.
          </p>
        </div>
      </section>

      <LandingFooter footerLink={{ href: "/features", label: "Features" }} />
    </main>
  )
}
