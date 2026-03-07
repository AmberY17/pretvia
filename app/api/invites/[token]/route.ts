import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    const db = await getDb()
    const invite = await db.collection("invites").findOne({ token })

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    if (new Date() > (invite.expiresAt as Date)) {
      await db.collection("invites").deleteOne({ token })
      return NextResponse.json({ error: "Invite expired" }, { status: 410 })
    }

    const group = await db.collection("groups").findOne({
      _id: new ObjectId(invite.groupId as string),
    })

    return NextResponse.json({
      type: invite.type,
      email: invite.email,
      athleteEmail: invite.athleteEmail ?? null,
      groupId: invite.groupId,
      groupName: (group?.name as string) ?? null,
    })
  } catch (error) {
    console.error("Resolve invite error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
