import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import {
  handleUnder13ParentInvite,
  handleAthleteInvite,
  handleParentInvite,
  handleCoachInvite,
} from "./type-handlers"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    const db = await getDb()
    // Atomically claim the invite — prevents two simultaneous redemptions
    const invite = await db.collection("invites").findOneAndDelete({ token })

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    if (new Date() > (invite.expiresAt as Date)) {
      return NextResponse.json({ error: "Invite expired" }, { status: 410 })
    }

    const type = invite.type as string
    const groupId = invite.groupId as string
    const group = await db.collection("groups").findOne({
      _id: new ObjectId(groupId),
    })
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    const body = await req.json()

    if (type === "under13_parent") {
      return handleUnder13ParentInvite(db, invite, group, body, token)
    }
    if (type === "athlete") {
      return handleAthleteInvite(db, invite, group, body, token)
    }
    if (type === "parent") {
      return handleParentInvite(db, invite, group, body, token)
    }
    if (type === "coach") {
      return handleCoachInvite(db, invite, group, body, token)
    }

    return NextResponse.json({ error: "Unknown invite type" }, { status: 400 })
  } catch (error) {
    console.error("Redeem invite error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    )
  }
}
