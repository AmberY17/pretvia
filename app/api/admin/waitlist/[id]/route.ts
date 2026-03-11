import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getDb } from "@/lib/mongodb"
import { safeObjectId } from "@/lib/objectid"

async function verifyAdminSession(): Promise<boolean> {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) return false
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === adminSecret
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const oid = safeObjectId(id)
    if (!oid) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const db = await getDb()
    const result = await db.collection("waitlist").deleteOne({ _id: oid })
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/admin/waitlist/[id]:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
