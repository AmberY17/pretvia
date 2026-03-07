import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { canManageGroup } from "@/lib/api-auth"
import {
  sendAthleteInviteEmail,
  sendUnder13ParentInviteEmail,
  sendParentInviteEmail,
} from "@/lib/resend"
const INVITE_EXPIRY_DAYS = 7

async function ensureInviteIndexes(db: Awaited<ReturnType<typeof getDb>>) {
  const invites = db.collection("invites")
  await invites.createIndex({ token: 1 }, { unique: true })
  await invites.createIndex({ groupId: 1, expiresAt: 1 })
}

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
    const { isUnder13, athleteEmail, parentEmail, athleteNamePlaceholder, parentOnly } = body
    const placeholder = typeof athleteNamePlaceholder === "string" ? athleteNamePlaceholder.trim().slice(0, 100) || undefined : undefined

    const group = await db.collection("groups").findOne({
      _id: new ObjectId(groupId),
    })
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }
    const groupName = (group.name as string) ?? "the group"

    await ensureInviteIndexes(db)

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

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
          : athleteUser.groupId === groupId
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
        await db.collection("invites").deleteOne({ token })
        return NextResponse.json(
          { error: sendResult.error ?? "Failed to send invite email" },
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
        await db.collection("invites").deleteOne({ token })
        return NextResponse.json(
          { error: sendResult.error ?? "Failed to send invite email" },
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
      results.errors.push(`${athlete}: ${athleteSendResult.error}`)
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
        results.errors.push(`${parent}: ${parentSendResult.error}`)
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
