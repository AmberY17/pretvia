import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createSession } from "@/lib/auth"
import { applyGroupTrainingScheduleToUser } from "@/lib/group-training-schedule"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

function getDisplayName(firstName: string, lastName: string): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ") || "User"
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.redirect(`${APP_URL}/auth?error=missing_token`)
    }

    const db = await getDb()
    const pending = await db.collection("pending_under13_child").findOne({ token }) as {
      token: string
      childEmail: string
      childPassword: string
      childFirstName: string
      childLastName: string
      childDateOfBirth: string | null
      parentEmail: string
      parentFirstName: string
      parentLastName: string
      parentPassword: string
      groupId: string
      inviteToken?: string
      expiresAt: Date
    } | null

    if (!pending) {
      return NextResponse.redirect(`${APP_URL}/auth?error=verification_expired`)
    }

    if (new Date() > pending.expiresAt) {
      await db.collection("pending_under13_child").deleteOne({ token })
      return NextResponse.redirect(`${APP_URL}/auth?error=verification_expired`)
    }

    const groupId = pending.groupId
    const group = await db.collection("groups").findOne({
      _id: new ObjectId(groupId),
    })
    if (!group) {
      await db.collection("pending_under13_child").deleteOne({ token })
      return NextResponse.redirect(`${APP_URL}/auth?error=group_not_found`)
    }

    const existingChild = await db.collection("users").findOne({ email: pending.childEmail })
    if (existingChild) {
      await db.collection("pending_under13_child").deleteOne({ token })
      return NextResponse.redirect(`${APP_URL}/auth?error=already_exists`)
    }

    const childDisplayName = getDisplayName(pending.childFirstName, pending.childLastName)
    const childResult = await db.collection("users").insertOne({
      email: pending.childEmail,
      password: pending.childPassword,
      displayName: childDisplayName,
      firstName: pending.childFirstName,
      lastName: pending.childLastName,
      dateOfBirth: pending.childDateOfBirth ?? null,
      role: "athlete",
      groupId,
      groupIds: [groupId],
      profileComplete: true,
      authProvider: "email",
      emailVerified: true,
      createdAt: new Date(),
    })
    const athleteId = childResult.insertedId.toString()

    await db.collection("groupMemberships").updateOne(
      { userId: athleteId, groupId },
      { $setOnInsert: { userId: athleteId, groupId, roleIds: [] } },
      { upsert: true }
    )

    if (Array.isArray(group.trainingScheduleTemplate) && group.trainingScheduleTemplate.length > 0) {
      await applyGroupTrainingScheduleToUser(
        db,
        athleteId,
        groupId,
        group.trainingScheduleTemplate as { dayOfWeek: number; time: string }[]
      )
    }

    const parentEmailNorm = pending.parentEmail
    const existingParent = await db
      .collection("users")
      .findOne({ email: parentEmailNorm, role: "guardian" })

    let guardianId: string
    if (existingParent) {
      guardianId = existingParent._id.toString()
      await db.collection("guardianLinks").updateOne(
        { guardianId, athleteId },
        { $setOnInsert: { guardianId, athleteId } },
        { upsert: true }
      )
    } else {
      const parentDisplayName = getDisplayName(pending.parentFirstName, pending.parentLastName)
      const parentResult = await db.collection("users").insertOne({
        email: parentEmailNorm,
        password: pending.parentPassword,
        displayName: parentDisplayName,
        firstName: pending.parentFirstName,
        lastName: pending.parentLastName,
        role: "guardian",
        groupId: null,
        groupIds: [],
        profileComplete: true,
        authProvider: "email",
        emailVerified: true,
        createdAt: new Date(),
      })
      guardianId = parentResult.insertedId.toString()
      await db.collection("guardianLinks").insertOne({ guardianId, athleteId })
    }

    await db.collection("pending_under13_child").deleteOne({ token })
    if (pending.inviteToken) {
      await db.collection("invites").deleteOne({ token: pending.inviteToken })
    }

    const user = await db.collection("users").findOne({ _id: new ObjectId(guardianId) })
    await createSession({
      userId: guardianId,
      email: parentEmailNorm,
      displayName: user?.displayName,
      role: "guardian",
      groupId: undefined,
    })

    return NextResponse.redirect(`${APP_URL}/dashboard/parent`)
  } catch (error) {
    console.error("Verify under-13 child error:", error)
    return NextResponse.redirect(`${APP_URL}/auth?error=verification_failed`)
  }
}
