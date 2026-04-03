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
      addOnsVisible: doc?.addOnsVisible ?? true,
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
    const { pricingPageVisible, addOnsVisible } = body

    const update: Record<string, boolean> = {}

    if (pricingPageVisible !== undefined) {
      if (typeof pricingPageVisible !== "boolean") {
        return NextResponse.json({ error: "Invalid value for pricingPageVisible" }, { status: 400 })
      }
      update.pricingPageVisible = pricingPageVisible
    }

    if (addOnsVisible !== undefined) {
      if (typeof addOnsVisible !== "boolean") {
        return NextResponse.json({ error: "Invalid value for addOnsVisible" }, { status: 400 })
      }
      update.addOnsVisible = addOnsVisible
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 })
    }

    const db = await getDb()
    await db.collection("siteSettings").findOneAndUpdate(
      { key: "site" },
      { $set: update },
      { upsert: true }
    )

    return NextResponse.json(update)
  } catch (err) {
    console.error("PATCH /api/admin/settings:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
