import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getDb } from "@/lib/mongodb"
import { safeObjectId } from "@/lib/objectid"
import { sendWaitlistApprovalEmail } from "@/lib/resend"
import { verifyAdminSession } from "@/lib/admin-auth"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function POST(
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
    const entry = await db.collection("waitlist").findOne({ _id: oid })
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    if (entry.status === "approved" || entry.usedAt) {
      return NextResponse.json(
        { error: "Entry has already been approved or used" },
        { status: 409 }
      )
    }

    const inviteToken = randomUUID()
    const inviteExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await db.collection("waitlist").updateOne(
      { _id: oid },
      {
        $set: {
          status: "approved",
          approvedAt: new Date(),
          inviteToken,
          inviteExpiresAt,
        },
      }
    )

    const signupUrl = `${APP_URL}/auth?signup=coach&token=${inviteToken}`
    const emailResult = await sendWaitlistApprovalEmail(entry.email, entry.name, signupUrl)
    if (emailResult.ok) {
      await db.collection("waitlist").updateOne({ _id: oid }, { $set: { inviteSentAt: new Date() } })
    } else {
      console.error("Failed to send approval email:", emailResult.error)
    }

    return NextResponse.json({ success: true, emailOk: emailResult.ok })
  } catch (err) {
    console.error("POST /api/admin/waitlist/[id]/approve:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
