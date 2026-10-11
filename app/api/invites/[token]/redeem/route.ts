import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getSession } from "@/lib/auth"
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

    // Peek without deleting to allow pre-claim validation
    const inviteCheck = await db.collection("invites").findOne({ token })
    if (!inviteCheck) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }
    if (new Date() > (inviteCheck.expiresAt as Date)) {
      await db.collection("invites").deleteOne({ token })
      return NextResponse.json({ error: "Invite expired" }, { status: 410 })
    }

    const body = await req.json()

    // If a user already exists with the invite email, require a matching session
    // BEFORE consuming the invite so they can log in and retry without the link dying.
    const inviteType = inviteCheck.type as string
    if (inviteType === "athlete" || inviteType === "coach" || inviteType === "parent") {
      const invEmail = (inviteCheck.email as string).toLowerCase()
      const existingUser = await db.collection("users").findOne({ email: invEmail })
      if (existingUser) {
        const session = await getSession()
        if (!session || session.email?.toLowerCase() !== invEmail) {
          return NextResponse.json(
            { error: "Please sign in with the invite email before joining" },
            { status: 401 },
          )
        }
      }
    }

    // Atomically claim so two tabs can't both redeem; it's put back below if redemption fails
    const invite = await db.collection("invites").findOneAndDelete({ token })
    if (!invite) {
      // Race: claimed by a concurrent request between findOne and findOneAndDelete
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    const type = invite.type as string
    const groupId = invite.groupId as string
    const group = await db.collection("groups").findOne({
      _id: new ObjectId(groupId),
    })
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    const handlers = {
      under13_parent: handleUnder13ParentInvite,
      athlete: handleAthleteInvite,
      parent: handleParentInvite,
      coach: handleCoachInvite,
    } as const
    const handler = handlers[type as keyof typeof handlers]
    // The invite was claimed above. If redemption fails (typo'd password, wrong email, email send
    // failure, crash…), put it back so the link keeps working for a retry.
    let res: NextResponse
    try {
      res = handler
        ? await handler(db, invite, group, body, token)
        : NextResponse.json({ error: "Unknown invite type" }, { status: 400 })
    } catch (err) {
      await db.collection("invites").insertOne(invite)
      throw err
    }
    if (res.status >= 400) {
      await db.collection("invites").insertOne(invite)
    }
    return res
  } catch (error) {
    console.error("Redeem invite error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    )
  }
}
