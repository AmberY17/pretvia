import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { verifyAdminSession } from "@/lib/admin-auth"

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
