import { getDb } from "@/lib/mongodb"
import { WaitlistForm } from "@/components/waitlist/waitlist-form"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Join the waitlist",
  description: "Request early access as a coach on Pretvia.",
  openGraph: {
    title: "Join the Pretvia Waitlist",
    description: "Request early access as a coach on Pretvia.",
    url: "https://pretvia.com/waitlist",
  },
}

export default async function WaitlistPage() {
  const db = await getDb()
  const settings = await db.collection("siteSettings").findOne({ key: "site" })
  const activeEggs = {
    superEarlyAccess: settings?.eggSuperEarlyAccess ?? false,
    clickFrenzy: settings?.eggClickFrenzy ?? false,
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-foreground">Join the waitlist</h1>
          <p className="text-muted-foreground">
            Pretvia is in early access for coaches. Apply below and we&apos;ll send you an invite link when your spot opens up.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <WaitlistForm activeEggs={activeEggs} />
        </div>
      </div>
    </main>
  )
}
