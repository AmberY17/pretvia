import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { canManageGroup } from "@/lib/api-auth"
import {
  isAlreadyGroupMember,
  hasActiveInvite,
  ALREADY_MEMBER_ERROR,
  ACTIVE_INVITE_ERROR,
} from "./guards"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId } = await params
    const db = await getDb()

    if (!(await canManageGroup(db, session.userId, groupId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    const invite = await db.collection("invites").findOne({ token, groupId })
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    if (
      invite.type !== "athlete" &&
      invite.type !== "under13_parent" &&
      invite.type !== "coach"
    ) {
      return NextResponse.json({ error: "Cannot cancel this invite type" }, { status: 400 })
    }

    if (invite.type === "coach") {
      const group = await db.collection("groups").findOne({ _id: new ObjectId(groupId) })
      if (group?.headCoachId?.toString() !== session.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("invites").deleteOne({ token, groupId })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cancel invite error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
import {
  sendAthleteInviteEmail,
  sendCoachInviteEmail,
  sendUnder13ParentInviteEmail,
  sendParentInviteEmail,
} from "@/lib/resend"
import { getUserSubscription, getEffectiveLimits } from "@/lib/subscription"
const INVITE_EXPIRY_DAYS = 7

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId } = await params
    const db = await getDb()

    if (!(await canManageGroup(db, session.userId, groupId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { type: inviteType, coachEmail, isUnder13, athleteEmail, parentEmail, athleteNamePlaceholder, parentOnly } = body
    const placeholder = typeof athleteNamePlaceholder === "string" ? athleteNamePlaceholder.trim().slice(0, 100) || undefined : undefined

    const group = await db.collection("groups").findOne({
      _id: new ObjectId(groupId),
    })
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }
    const groupName = (group.name as string) ?? "the group"

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    if (inviteType === "coach") {
      if (group.headCoachId?.toString() !== session.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const sub = await getUserSubscription(db, session.userId)
      if (sub.plan !== "club") {
        return NextResponse.json(
          { error: "Coach invites require the Club plan" },
          { status: 403 }
        )
      }

      const email = (coachEmail ?? "").trim().toLowerCase()
      if (!email) {
        return NextResponse.json({ error: "Coach email is required" }, { status: 400 })
      }

      const coachIds: string[] = Array.isArray(group.coachIds) ? group.coachIds : []
      const limits = getEffectiveLimits(sub)
      if (coachIds.length >= limits.coachSeats) {
        return NextResponse.json(
          { error: "Coach seat limit reached" },
          { status: 403 }
        )
      }

      const existingCoach = await db.collection("users").findOne({ email, role: "coach" })
      if (existingCoach) {
        const isAlreadyCoach = coachIds.includes(existingCoach._id.toString())
        if (isAlreadyCoach) {
          return NextResponse.json(
            { error: "This email is already a coach in this group" },
            { status: 409 }
          )
        }
      }

      if (await hasActiveInvite(db, groupId, email, "coach")) {
        return NextResponse.json({ error: ACTIVE_INVITE_ERROR }, { status: 409 })
      }

      const token = randomUUID()
      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      await db.collection("invites").insertOne({
        groupId,
        token,
        type: "coach",
        email,
        createdBy: session.userId,
        expiresAt,
        createdAt: new Date(),
      })

      const inviteUrl = `${APP_URL}/invite/${token}`
      const sendResult = await sendCoachInviteEmail(email, inviteUrl, groupName)
      if (!sendResult.ok) {
        console.error("Coach invite email send failed:", sendResult.error)
        await db.collection("invites").deleteOne({ token })
        return NextResponse.json(
          { error: "Failed to send invite email" },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, message: `Coach invite sent to ${email}` })
    }

    if (parentOnly) {
      const parent = (parentEmail ?? "").trim().toLowerCase()
      const athlete = (athleteEmail ?? "").trim().toLowerCase()
      if (!parent || !athlete) {
        return NextResponse.json(
          { error: "Guardian email and athlete email are required" },
          { status: 400 }
        )
      }
      if (parent === athlete) {
        return NextResponse.json(
          { error: "Guardian email must be different from athlete email" },
          { status: 400 }
        )
      }
      const athleteUser = await db
        .collection("users")
        .findOne({ email: athlete, role: "athlete" })
      if (!athleteUser) {
        return NextResponse.json(
          { error: "Athlete not found in this group" },
          { status: 400 }
        )
      }
      const isMember =
        Array.isArray(athleteUser.groupIds)
          ? athleteUser.groupIds.includes(groupId)
          : athleteUser.activeGroupId === groupId
      if (!isMember) {
        return NextResponse.json(
          { error: "Athlete is not in this group" },
          { status: 400 }
        )
      }
      const token = randomUUID()
      const expiresAt = new Date(
        Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      )
      await db.collection("invites").insertOne({
        groupId,
        token,
        type: "parent",
        email: parent,
        athleteEmail: athlete,
        createdBy: session.userId,
        expiresAt,
        createdAt: new Date(),
      })
      const inviteUrl = `${APP_URL}/invite/${token}`
      const sendResult = await sendParentInviteEmail(
        parent,
        inviteUrl,
        groupName,
        "Athlete"
      )
      if (!sendResult.ok) {
        console.error("Parent invite email send failed:", sendResult.error)
        await db.collection("invites").deleteOne({ token })
        return NextResponse.json(
          { error: "Failed to send invite email" },
          { status: 500 }
        )
      }
      return NextResponse.json({
        success: true,
        message: `Invite sent to ${parent}`,
      })
    }

    if (isUnder13) {
      const email = (parentEmail ?? "").trim().toLowerCase()
      if (!email) {
        return NextResponse.json(
          { error: "Parent email is required for under-13 invites" },
          { status: 400 }
        )
      }

      const token = randomUUID()
      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

      await db.collection("invites").insertOne({
        groupId,
        token,
        type: "under13_parent",
        email,
        athleteNamePlaceholder: placeholder,
        createdBy: session.userId,
        expiresAt,
        createdAt: new Date(),
      })

      const inviteUrl = `${APP_URL}/invite/${token}`
      const sendResult = await sendUnder13ParentInviteEmail(email, inviteUrl, groupName)
      if (!sendResult.ok) {
        console.error("Under-13 parent invite email send failed:", sendResult.error)
        await db.collection("invites").deleteOne({ token })
        return NextResponse.json(
          { error: "Failed to send invite email" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Invite sent to ${email}`,
      })
    }

    const athlete = (athleteEmail ?? "").trim().toLowerCase()
    if (!athlete) {
      return NextResponse.json(
        { error: "Athlete email is required" },
        { status: 400 }
      )
    }

    // Shared with the bulk-invite route so the two cannot drift apart.
    if (await isAlreadyGroupMember(db, groupId, athlete)) {
      return NextResponse.json({ error: ALREADY_MEMBER_ERROR }, { status: 409 })
    }

    if (await hasActiveInvite(db, groupId, athlete, "athlete")) {
      return NextResponse.json({ error: ACTIVE_INVITE_ERROR }, { status: 409 })
    }

    const results: { sent: string[]; errors: string[] } = { sent: [], errors: [] }

    const athleteToken = randomUUID()
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    await db.collection("invites").insertOne({
      groupId,
      token: athleteToken,
      type: "athlete",
      email: athlete,
      athleteNamePlaceholder: placeholder,
      createdBy: session.userId,
      expiresAt,
      createdAt: new Date(),
    })

    const athleteInviteUrl = `${APP_URL}/invite/${athleteToken}`
    const athleteSendResult = await sendAthleteInviteEmail(athlete, athleteInviteUrl, groupName)
    if (athleteSendResult.ok) {
      results.sent.push(athlete)
    } else {
      console.error("Athlete invite email send failed:", athlete, athleteSendResult.error)
      results.errors.push(`${athlete}: failed to send invite email`)
      await db.collection("invites").deleteOne({ token: athleteToken })
    }

    const parent = typeof parentEmail === "string" ? parentEmail.trim().toLowerCase() : ""
    if (parent && parent !== athlete) {
      const parentToken = randomUUID()
      await db.collection("invites").insertOne({
        groupId,
        token: parentToken,
        type: "parent",
        email: parent,
        athleteEmail: athlete,
        createdBy: session.userId,
        expiresAt,
        createdAt: new Date(),
      })

      const parentInviteUrl = `${APP_URL}/invite/${parentToken}`
      const parentSendResult = await sendParentInviteEmail(
        parent,
        parentInviteUrl,
        groupName,
        "Athlete"
      )
      if (parentSendResult.ok) {
        results.sent.push(parent)
      } else {
        console.error("Parent invite email send failed:", parent, parentSendResult.error)
        results.errors.push(`${parent}: failed to send invite email`)
        await db.collection("invites").deleteOne({ token: parentToken })
      }
    }

    const atLeastOneSent = results.sent.length > 0
    return NextResponse.json({
      success: atLeastOneSent,
      message: atLeastOneSent
        ? results.errors.length > 0
          ? `Invites sent to ${results.sent.join(", ")}. Failed: ${results.errors.join("; ")}`
          : `Invites sent to ${results.sent.join(", ")}`
        : results.errors[0] ?? "Failed to send invites",
      sent: results.sent,
      errors: results.errors.length > 0 ? results.errors : undefined,
    })
  } catch (error) {
    console.error("Create invite error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
