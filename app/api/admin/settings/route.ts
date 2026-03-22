import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getDb } from "@/lib/mongodb"

async function verifyAdminSession(): Promise<boolean> {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) return false
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === adminSecret
}

export async function GET() {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const doc = await db.collection("siteSettings").findOne({ key: "site" })

    return NextResponse.json({
      pricingPageVisible: doc?.pricingPageVisible ?? false,
      eggSuperEarlyAccess: doc?.eggSuperEarlyAccess ?? false,
      eggClickFrenzy: doc?.eggClickFrenzy ?? false,
      eggEmojiCatch: doc?.eggEmojiCatch ?? false,
      eggForgotPassword: doc?.eggForgotPassword ?? false,
      eggSlotMachineEmoji: doc?.eggSlotMachineEmoji ?? false,
      eggRunawayTrash: doc?.eggRunawayTrash ?? false,
    })
  } catch (err) {
    console.error("GET /api/admin/settings:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const allowedFields = ["pricingPageVisible", "eggSuperEarlyAccess", "eggClickFrenzy", "eggEmojiCatch", "eggForgotPassword", "eggSlotMachineEmoji", "eggRunawayTrash", "eggChaosReset"]
    const $set: Record<string, boolean> = {}
    for (const field of allowedFields) {
      if (typeof body[field] === "boolean") $set[field] = body[field]
    }

    if (Object.keys($set).length === 0) {
      return NextResponse.json({ error: "Invalid value" }, { status: 400 })
    }

    const db = await getDb()
    await db.collection("siteSettings").findOneAndUpdate(
      { key: "site" },
      { $set },
      { upsert: true }
    )

    return NextResponse.json($set)
  } catch (err) {
    console.error("PATCH /api/admin/settings:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
