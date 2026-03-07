import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import bcrypt from "bcryptjs"
import { getSession, createSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import {
  applyGroupTrainingScheduleToUser,
} from "@/lib/group-training-schedule"
import { sendUnder13ChildVerificationEmail } from "@/lib/resend"

function getDisplayName(firstName: string, lastName: string): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ") || "User"
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
    const invite = await db.collection("invites").findOne({ token })

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    if (new Date() > (invite.expiresAt as Date)) {
      await db.collection("invites").deleteOne({ token })
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

    const session = await getSession()
    const body = await req.json()

    if (type === "under13_parent") {
      const {
        childFirstName,
        childLastName,
        childEmail,
        childPassword,
        childDateOfBirth,
        parentFirstName,
        parentLastName,
        parentEmail,
        parentPassword,
      } = body

      const invEmail = (invite.email as string).toLowerCase()
      if ((parentEmail ?? "").toLowerCase() !== invEmail) {
        return NextResponse.json(
          { error: "Parent email must match the invite" },
          { status: 400 }
        )
      }

      const childEmailNorm = (childEmail ?? "").trim().toLowerCase()
      if (!childEmailNorm || !childPassword || !childFirstName || !childLastName) {
        return NextResponse.json(
          { error: "Child first name, last name, email, and password are required" },
          { status: 400 }
        )
      }
      if (childPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        )
      }

      const parentEmailNorm = invEmail
      if (childEmailNorm === parentEmailNorm) {
        return NextResponse.json(
          { error: "Child's email must be different from parent's email" },
          { status: 400 }
        )
      }

      const existingChild = await db.collection("users").findOne({ email: childEmailNorm })
      if (existingChild) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        )
      }

      const childEmailDiffers = childEmailNorm !== parentEmailNorm

      if (childEmailDiffers) {
        const verifyToken = randomUUID()
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
        const verifyUrl = `${APP_URL}/api/auth/verify-under13-child?token=${encodeURIComponent(verifyToken)}`
        const groupName = (group.name as string) ?? "the group"

        const childHash = await bcrypt.hash(childPassword, 12)
        if (!parentPassword || parentPassword.length < 6) {
          return NextResponse.json(
            { error: "Parent password is required (min 6 characters)" },
            { status: 400 }
          )
        }
        const parentHashReal = await bcrypt.hash(parentPassword, 12)

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
        await db.collection("pending_under13_child").insertOne({
          token: verifyToken,
          childEmail: childEmailNorm,
          childPassword: childHash,
          childFirstName: childFirstName.trim(),
          childLastName: childLastName.trim(),
          childDateOfBirth: childDateOfBirth ?? null,
          parentEmail: parentEmailNorm,
          parentFirstName: (parentFirstName ?? "").trim() || "Parent",
          parentLastName: (parentLastName ?? "").trim() || "Guardian",
          parentPassword: parentHashReal,
          groupId,
          inviteToken: token,
          expiresAt,
          createdAt: new Date(),
        })

        const sendResult = await sendUnder13ChildVerificationEmail(
          childEmailNorm,
          verifyUrl,
          groupName
        )
        if (!sendResult.ok) {
          await db.collection("pending_under13_child").deleteOne({ token: verifyToken })
          return NextResponse.json(
            { error: sendResult.error ?? "Failed to send verification email" },
            { status: 500 }
          )
        }

        await db.collection("invites").deleteOne({ token })

        return NextResponse.json({
          success: true,
          requiresChildVerification: true,
          message: "Check your child's email to verify their account.",
        })
      }

      const childDisplayName = getDisplayName(childFirstName, childLastName)
      const childHash = await bcrypt.hash(childPassword, 12)
      const childResult = await db.collection("users").insertOne({
        email: childEmailNorm,
        password: childHash,
        displayName: childDisplayName,
        firstName: childFirstName.trim(),
        lastName: childLastName.trim(),
        dateOfBirth: childDateOfBirth ?? null,
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
        const pFirst = (parentFirstName ?? "").trim() || "Parent"
        const pLast = (parentLastName ?? "").trim() || "Guardian"
        const parentDisplayName = getDisplayName(pFirst, pLast)
        if (!parentPassword || parentPassword.length < 6) {
          return NextResponse.json(
            { error: "Parent password is required (min 6 characters)" },
            { status: 400 }
          )
        }
        const parentHashReal = await bcrypt.hash(parentPassword, 12)
        const parentResult = await db.collection("users").insertOne({
          email: parentEmailNorm,
          password: parentHashReal,
          displayName: parentDisplayName,
          firstName: pFirst,
          lastName: pLast,
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

      await db.collection("invites").deleteOne({ token })

      await createSession({
        userId: guardianId,
        email: parentEmailNorm,
        displayName: (await db.collection("users").findOne({ _id: new ObjectId(guardianId) }))?.displayName,
        role: "guardian",
        groupId: undefined,
      })

      return NextResponse.json({
        success: true,
        redirect: "/dashboard/parent",
        user: { role: "guardian" },
      })
    }

    if (type === "athlete") {
      const invEmail = (invite.email as string).toLowerCase()
      const {
        firstName,
        lastName,
        email,
        password,
        dateOfBirth,
        createAccount,
      } = body

      const emailNorm = (email ?? invEmail).trim().toLowerCase()
      if (emailNorm !== invEmail) {
        return NextResponse.json(
          { error: "Email must match the invite" },
          { status: 400 }
        )
      }

      let userId: string
      const existing = await db.collection("users").findOne({ email: emailNorm })

      if (existing) {
        const currentSession = await getSession()
        if (!currentSession || currentSession.email?.toLowerCase() !== emailNorm) {
          return NextResponse.json(
            { error: "Please sign in first with the invite email" },
            { status: 401 }
          )
        }
        if (existing.role !== "athlete" && existing.role !== "coach") {
          return NextResponse.json(
            { error: "This invite is for an athlete account" },
            { status: 400 }
          )
        }
        userId = existing._id.toString()
        const groupIds = Array.isArray(existing.groupIds) ? [...existing.groupIds] : []
        if (!groupIds.includes(groupId)) {
          groupIds.push(groupId)
          await db.collection("users").updateOne(
            { _id: existing._id },
            { $set: { groupIds, groupId } }
          )
          await db.collection("groupMemberships").updateOne(
            { userId, groupId },
            { $setOnInsert: { userId, groupId, roleIds: [] } },
            { upsert: true }
          )
          if (Array.isArray(group.trainingScheduleTemplate) && group.trainingScheduleTemplate.length > 0) {
            await applyGroupTrainingScheduleToUser(
              db,
              userId,
              groupId,
              group.trainingScheduleTemplate as { dayOfWeek: number; time: string }[]
            )
          }
        }
      } else if (createAccount) {
        if (!firstName || !lastName || !password) {
          return NextResponse.json(
            { error: "First name, last name, and password are required" },
            { status: 400 }
          )
        }
        if (password.length < 6) {
          return NextResponse.json(
            { error: "Password must be at least 6 characters" },
            { status: 400 }
          )
        }
        const displayName = getDisplayName(firstName, lastName)
        const hash = await bcrypt.hash(password, 12)
        const result = await db.collection("users").insertOne({
          email: emailNorm,
          password: hash,
          displayName,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dateOfBirth ?? null,
          role: "athlete",
          groupId,
          groupIds: [groupId],
          profileComplete: true,
          authProvider: "email",
          emailVerified: true,
          createdAt: new Date(),
        })
        userId = result.insertedId.toString()
        await db.collection("groupMemberships").insertOne({ userId, groupId, roleIds: [] })
        if (Array.isArray(group.trainingScheduleTemplate) && group.trainingScheduleTemplate.length > 0) {
          await applyGroupTrainingScheduleToUser(
            db,
            userId,
            groupId,
            group.trainingScheduleTemplate as { dayOfWeek: number; time: string }[]
          )
        }
      } else {
        return NextResponse.json(
          { error: "No account found. Create an account to join." },
          { status: 400 }
        )
      }

      await db.collection("invites").deleteOne({ token })

      const pendingGuardians = await db
        .collection("guardianPendingAthletes")
        .find({ athleteEmail: emailNorm })
        .toArray()
      for (const p of pendingGuardians) {
        await db.collection("guardianLinks").updateOne(
          { guardianId: p.guardianId, athleteId: userId },
          { $setOnInsert: { guardianId: p.guardianId, athleteId: userId } },
          { upsert: true }
        )
        await db.collection("guardianPendingAthletes").deleteOne({ _id: p._id })
      }

      const user = await db.collection("users").findOne({ _id: new ObjectId(userId) })
      await createSession({
        userId,
        email: user?.email ?? emailNorm,
        displayName: user?.displayName,
        role: "athlete",
        groupId,
      })

      return NextResponse.json({
        success: true,
        redirect: "/dashboard",
        user: { id: userId, role: "athlete", groupId },
      })
    }

    if (type === "parent") {
      const invEmail = (invite.email as string).toLowerCase()
      const athleteEmail = (invite.athleteEmail as string)?.toLowerCase()
      const { firstName, lastName, email, password, createAccount } = body

      const emailNorm = (email ?? invEmail).trim().toLowerCase()
      if (emailNorm !== invEmail) {
        return NextResponse.json(
          { error: "Email must match the invite" },
          { status: 400 }
        )
      }

      if (!athleteEmail) {
        return NextResponse.json(
          { error: "Invalid parent invite" },
          { status: 400 }
        )
      }

      let guardianId: string
      const existing = await db.collection("users").findOne({ email: emailNorm, role: "guardian" })

      if (existing) {
        const currentSession = await getSession()
        if (!currentSession || currentSession.email?.toLowerCase() !== emailNorm) {
          return NextResponse.json(
            { error: "Please sign in first with the invite email" },
            { status: 401 }
          )
        }
        guardianId = existing._id.toString()
      } else if (createAccount) {
        if (!firstName || !lastName || !password) {
          return NextResponse.json(
            { error: "First name, last name, and password are required" },
            { status: 400 }
          )
        }
        if (password.length < 6) {
          return NextResponse.json(
            { error: "Password must be at least 6 characters" },
            { status: 400 }
          )
        }
        const displayName = getDisplayName(firstName, lastName)
        const hash = await bcrypt.hash(password, 12)
        const result = await db.collection("users").insertOne({
          email: emailNorm,
          password: hash,
          displayName,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: "guardian",
          groupId: null,
          groupIds: [],
          profileComplete: true,
          authProvider: "email",
          emailVerified: true,
          createdAt: new Date(),
        })
        guardianId = result.insertedId.toString()
      } else {
        return NextResponse.json(
          { error: "No guardian account found. Create an account first." },
          { status: 400 }
        )
      }

      const athlete = await db.collection("users").findOne({ email: athleteEmail, role: "athlete" })
      if (athlete) {
        const athleteId = athlete._id.toString()
        await db.collection("guardianLinks").updateOne(
          { guardianId, athleteId },
          { $setOnInsert: { guardianId, athleteId } },
          { upsert: true }
        )
      } else {
        await db.collection("guardianPendingAthletes").updateOne(
          { guardianId, athleteEmail },
          { $set: { guardianId, athleteEmail } },
          { upsert: true }
        )
      }

      await db.collection("invites").deleteOne({ token })

      const user = await db.collection("users").findOne({ _id: new ObjectId(guardianId) })
      await createSession({
        userId: guardianId,
        email: user?.email ?? emailNorm,
        displayName: user?.displayName,
        role: "guardian",
        groupId: undefined,
      })

      return NextResponse.json({
        success: true,
        redirect: "/dashboard/parent",
        user: { id: guardianId, role: "guardian" },
      })
    }

    return NextResponse.json({ error: "Unknown invite type" }, { status: 400 })
  } catch (error) {
    console.error("Redeem invite error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
