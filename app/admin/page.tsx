import { getDb } from "@/lib/mongodb"
import { WaitlistTable, type WaitlistEntry } from "@/components/admin/waitlist-table"

export const metadata = {
  title: "Waitlist — Pretvia Admin",
}

export default async function AdminPage() {
  const db = await getDb()
  const rawEntries = await db
    .collection("waitlist")
    .find({})
    .sort({ createdAt: -1 })
    .toArray()

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

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Waitlist</h1>
            <p className="text-muted-foreground">{entries.length} application{entries.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <WaitlistTable initialEntries={entries} />
      </div>
    </main>
  )
}
