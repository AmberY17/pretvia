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
} from "../guards"
import {
  sendAthleteInviteEmail,
  sendUnder13ParentInviteEmail,
  sendParentInviteEmail,
} from "@/lib/resend"

const INVITE_EXPIRY_DAYS = 7
const MAX_BULK_INVITES = 100

interface BulkInviteRow {
  isUnder13: boolean
  athleteEmail?: string
  parentEmail?: string
  athleteNamePlaceholder?: string
}

export async function POST(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
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
    const invites: BulkInviteRow[] = body.invites
    if (!Array.isArray(invites) || invites.length === 0) {
      return NextResponse.json({ error: "No invites provided" }, { status: 400 })
    }
    if (invites.length > MAX_BULK_INVITES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BULK_INVITES} invites per import` },
        { status: 400 },
      )
    }

    const group = await db.collection("groups").findOne({ _id: new ObjectId(groupId) })
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }
    const groupName = (group.name as string) ?? "the group"

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    const sent: string[] = []
    const errors: { email: string; error: string }[] = []

    for (const row of invites) {
      const placeholder =
        typeof row.athleteNamePlaceholder === "string"
          ? row.athleteNamePlaceholder.trim().slice(0, 100) || undefined
          : undefined

      if (row.isUnder13) {
        // Under-13: requires parent email
        const parentEmail = (row.parentEmail ?? "").trim().toLowerCase()
        if (!parentEmail) {
          errors.push({
            email: "(under-13 row)",
            error: "Parent email is required for under-13 invites",
          })
          continue
        }
        // The single-invite route's dedupe, applied per row: re-importing a
        // roster used to re-send to everyone in it.
        if (await hasActiveInvite(db, groupId, parentEmail, "under13_parent")) {
          errors.push({ email: parentEmail, error: ACTIVE_INVITE_ERROR })
          continue
        }
        const token = randomUUID()
        await db.collection("invites").insertOne({
          groupId,
          token,
          type: "under13_parent",
          email: parentEmail,
          athleteNamePlaceholder: placeholder,
          createdBy: session.userId,
          expiresAt,
          createdAt: new Date(),
        })
        const sendResult = await sendUnder13ParentInviteEmail(
          parentEmail,
          `${APP_URL}/invite/${token}`,
          groupName,
        )
        if (sendResult.ok) {
          sent.push(parentEmail)
        } else {
          errors.push({ email: parentEmail, error: sendResult.error ?? "Failed to send" })
          await db.collection("invites").deleteOne({ token })
        }
      } else {
        // 13+: requires athlete email
        const athleteEmail = (row.athleteEmail ?? "").trim().toLowerCase()
        if (!athleteEmail) {
          errors.push({ email: "(athlete row)", error: "Athlete email is required" })
          continue
        }

        if (await isAlreadyGroupMember(db, groupId, athleteEmail)) {
          errors.push({ email: athleteEmail, error: ALREADY_MEMBER_ERROR })
          continue
        }
        if (await hasActiveInvite(db, groupId, athleteEmail, "athlete")) {
          errors.push({ email: athleteEmail, error: ACTIVE_INVITE_ERROR })
          continue
        }

        // Send athlete invite
        const athleteToken = randomUUID()
        await db.collection("invites").insertOne({
          groupId,
          token: athleteToken,
          type: "athlete",
          email: athleteEmail,
          athleteNamePlaceholder: placeholder,
          createdBy: session.userId,
          expiresAt,
          createdAt: new Date(),
        })
        const athleteSendResult = await sendAthleteInviteEmail(
          athleteEmail,
          `${APP_URL}/invite/${athleteToken}`,
          groupName,
        )
        if (athleteSendResult.ok) {
          sent.push(athleteEmail)
        } else {
          errors.push({ email: athleteEmail, error: athleteSendResult.error ?? "Failed to send" })
          await db.collection("invites").deleteOne({ token: athleteToken })
        }

        // Optionally send parent invite
        const parentEmail =
          typeof row.parentEmail === "string" ? row.parentEmail.trim().toLowerCase() : ""
        if (parentEmail && parentEmail !== athleteEmail) {
          if (await hasActiveInvite(db, groupId, parentEmail, "parent")) {
            errors.push({ email: parentEmail, error: ACTIVE_INVITE_ERROR })
            continue
          }
          const parentToken = randomUUID()
          await db.collection("invites").insertOne({
            groupId,
            token: parentToken,
            type: "parent",
            email: parentEmail,
            athleteEmail,
            createdBy: session.userId,
            expiresAt,
            createdAt: new Date(),
          })
          const parentSendResult = await sendParentInviteEmail(
            parentEmail,
            `${APP_URL}/invite/${parentToken}`,
            groupName,
            "Athlete",
          )
          if (parentSendResult.ok) {
            sent.push(parentEmail)
          } else {
            errors.push({ email: parentEmail, error: parentSendResult.error ?? "Failed to send" })
            await db.collection("invites").deleteOne({ token: parentToken })
          }
        }
      }
    }

    return NextResponse.json({ sent, errors })
  } catch (error) {
    console.error("Bulk invite error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
