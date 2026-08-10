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

/**
 * How long a reservation is honoured before another request may take it over.
 * Bounds the damage if a redeem crashes between claiming and completing.
 */
const CLAIM_TTL_MS = 5 * 60 * 1000

/** Hand a reserved invite back so the link keeps working after a failed redeem. */
async function releaseClaim(db: Awaited<ReturnType<typeof getDb>>, token: string) {
  try {
    await db.collection("invites").updateOne({ token }, { $unset: { claimedAt: "" } })
  } catch (err) {
    // Never mask the original failure with a cleanup error.
    console.error("Failed to release invite claim:", err)
  }
}

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

    // Reserve the invite rather than deleting it.
    //
    // The type handlers run several more validations (password length, name fields,
    // under-13 parent-email match, role mismatch) and each deletes the invite itself
    // on the success path. Deleting up front therefore destroyed the link whenever
    // one of those checks failed — a user who mistyped their password could never
    // use their invite again.
    //
    // A reservation keeps the concurrency guarantee (a second request cannot claim a
    // reserved invite) while letting a failed redeem hand the link back.
    const claimedAt = new Date()
    const staleCutoff = new Date(claimedAt.getTime() - CLAIM_TTL_MS)
    const invite = await db.collection("invites").findOneAndUpdate(
      {
        token,
        // A reservation left behind by a crashed request becomes claimable again.
        $or: [{ claimedAt: { $exists: false } }, { claimedAt: { $lt: staleCutoff } }],
      },
      { $set: { claimedAt } },
      { returnDocument: "after" },
    )
    if (!invite) {
      // The invite existed a moment ago (checked above), so losing the claim means a
      // concurrent redeem holds it.
      return NextResponse.json(
        { error: "This invite is already being redeemed. Please try again in a moment." },
        { status: 409 },
      )
    }

    try {
      const type = invite.type as string
      const groupId = invite.groupId as string
      const group = await db.collection("groups").findOne({
        _id: new ObjectId(groupId),
      })

      let response: NextResponse
      if (!group) {
        response = NextResponse.json({ error: "Group not found" }, { status: 404 })
      } else if (type === "under13_parent") {
        response = await handleUnder13ParentInvite(db, invite, group, body, token)
      } else if (type === "athlete") {
        response = await handleAthleteInvite(db, invite, group, body, token)
      } else if (type === "parent") {
        response = await handleParentInvite(db, invite, group, body, token)
      } else if (type === "coach") {
        response = await handleCoachInvite(db, invite, group, body, token)
      } else {
        response = NextResponse.json({ error: "Unknown invite type" }, { status: 400 })
      }

      // On success the handler has already deleted the invite, so this matches
      // nothing. On failure it returns the link to a usable state.
      if (!response.ok) await releaseClaim(db, token)
      return response
    } catch (err) {
      await releaseClaim(db, token)
      throw err
    }
  } catch (error) {
    console.error("Redeem invite error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    )
  }
}
