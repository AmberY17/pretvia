import { getDb } from "@/lib/mongodb"
import { WaitlistTable, type WaitlistEntry } from "@/components/admin/waitlist-table"
import { SiteSettingsToggle } from "@/components/admin/site-settings-toggle"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Waitlist — Pretvia Admin",
}

export default async function AdminPage() {
  const db = await getDb()
  const [rawEntries, siteSettings] = await Promise.all([
    db.collection("waitlist").find({}).sort({ createdAt: -1 }).toArray(),
    db.collection("siteSettings").findOne({ key: "site" }),
  ])

  const entries: WaitlistEntry[] = rawEntries.map((e) => ({
    _id: e._id.toString(),
    email: e.email,
    name: e.name,
    firstName: e.firstName,
    lastName: e.lastName,
    clubName: e.clubName,
    groups: e.groups,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
    approvedAt: e.approvedAt?.toISOString(),
    usedAt: e.usedAt?.toISOString(),
  }))

  const pricingPageVisible = siteSettings?.pricingPageVisible ?? false
  const addOnsVisible = siteSettings?.addOnsVisible ?? true

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-7xl space-y-12">
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground">Site Settings</h2>
          </div>
          <div className="max-w-md">
            <SiteSettingsToggle
              initialPricingPageVisible={pricingPageVisible}
              initialAddOnsVisible={addOnsVisible}
            />
          </div>
        </section>

        <section>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Waitlist</h2>
              <p className="text-muted-foreground">{entries.length} application{entries.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <WaitlistTable initialEntries={entries} />
        </section>
      </div>
    </main>
  )
}
