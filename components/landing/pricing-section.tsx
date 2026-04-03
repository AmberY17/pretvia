import { Check, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface PricingSectionProps {
  addOnsVisible: boolean
}

function FeatureRow({ included, label }: { included: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2">
      {included ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      ) : (
        <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
      )}
      <span className={included ? "text-sm text-foreground" : "text-sm text-muted-foreground/50"}>
        {label}
      </span>
    </li>
  )
}

function AthleteTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  )
}

export function PricingSection({ addOnsVisible }: PricingSectionProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-12">
      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Squad */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">Squad</h2>
            <Badge variant="secondary" className="text-xs">Free</Badge>
          </div>
          <div className="mb-1 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-foreground">$0</span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">One group, full experience.</p>
          <ul className="flex flex-col gap-2.5">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="flex items-center gap-2 text-sm text-foreground">
                1 group <AthleteTag label="20 athletes max" />
              </span>
            </li>
            <FeatureRow included label="All features unlocked" />
            <FeatureRow included label="Athlete & guardian access" />
            <FeatureRow included={false} label="Multiple groups" />
            <FeatureRow included={false} label="Club dashboard" />
          </ul>
          <div className="mt-auto pt-8">
            <Link href="/auth">
              <Button variant="outline" className="w-full">Get started free</Button>
            </Link>
          </div>
        </div>

        {/* Varsity */}
        <div className="flex flex-col rounded-2xl border-2 border-primary bg-card p-6 shadow-lg">
          <div className="mb-1">
            <h2 className="text-xl font-bold text-foreground">Varsity</h2>
          </div>
          <div className="mb-1 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-foreground">$5</span>
            <span className="text-sm text-muted-foreground">/ group / month</span>
          </div>
          <p className="mb-1 text-xs font-medium text-primary">$48/group/yr — save 2 months</p>
          <p className="mb-6 text-sm text-muted-foreground">Pay only for the groups you run.</p>
          <ul className="flex flex-col gap-2.5">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="flex items-center gap-2 text-sm text-foreground">
                Unlimited groups <AthleteTag label="20 athletes each" />
              </span>
            </li>
            <FeatureRow included label="All features unlocked" />
            <FeatureRow included label="Athlete & guardian access" />
            <FeatureRow included={false} label="Club dashboard" />
            <FeatureRow included={false} label="Multiple coaches" />
          </ul>
          <div className="mt-auto pt-8">
            <Link href="/auth">
              <Button className="w-full">Get started</Button>
            </Link>
          </div>
        </div>

        {/* Club */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
          <div className="mb-1">
            <h2 className="text-xl font-bold text-foreground">Club</h2>
          </div>
          <div className="mb-1 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-foreground">$49</span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
          <p className="mb-1 text-xs font-medium text-primary">$392/yr — save 2 months</p>
          <p className="mb-6 text-sm text-muted-foreground">One subscription for the whole club.</p>
          <ul className="flex flex-col gap-2.5">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="flex items-center gap-2 text-sm text-foreground">
                10 groups included <AthleteTag label="20 athletes each" />
              </span>
            </li>
            <FeatureRow included label="3 coach seats included" />
            <FeatureRow included label="Club dashboard" />
            <FeatureRow included label="Assign coaches to groups" />
            <FeatureRow included label="Unlimited coaches per group" />
            <FeatureRow included label="Add-on groups & coach seats" />
          </ul>
          <div className="mt-auto pt-8">
            <Link href="/auth">
              <Button variant="outline" className="w-full">Get started</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Team add-ons */}
      {addOnsVisible && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Club Add-ons
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-foreground">+5 groups</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add groups beyond the included 10, in bundles of 5.
              </p>
              <p className="mt-3 text-sm font-bold text-foreground">$10 / month</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-foreground">+3 coach seats</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Expand your coaching staff beyond the included 3.
              </p>
              <p className="mt-3 text-sm font-bold text-foreground">$15 / month</p>
            </div>
          </div>
        </div>
      )}

      {/* Billing policies */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Billing Policies
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">Annual discount</p>
            <p className="mt-1 text-sm font-semibold text-foreground">2 months free (~17% off)</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">Free tier</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Permanent, no trial needed</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">Cancellation</p>
            <p className="mt-1 text-sm font-semibold text-foreground">7-day grace period, then locked</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">Athletes &amp; guardians</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Always free, no seat cost</p>
          </div>
        </div>
      </div>
    </div>
  )
}
