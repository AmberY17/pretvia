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
    const entries = await db
      .collection("waitlist")
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({ entries })
  } catch (err) {
    console.error("GET /api/admin/waitlist:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
