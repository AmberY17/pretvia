import { NextResponse } from "next/server"
import { getSession, createSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Allow single emoji (complex emojis like 👨‍👩‍👧‍👦 can be many code units)
function isValidEmoji(val: unknown): boolean {
  if (val === null || val === "") return true
  if (typeof val !== "string") return false
  return val.length >= 1 && val.length <= 20
}

export async function PUT(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { displayName, profileEmoji } = body

    const db = await getDb()
    const updates: Record<string, unknown> = { updatedAt: new Date() }

    if (displayName !== undefined) {
      if (!displayName || displayName.trim().length < 2) {
        return NextResponse.json(
          { error: "Display name must be at least 2 characters" },
          { status: 400 }
        )
      }
      updates.displayName = displayName.trim()
      updates.profileComplete = true
    }

    if (profileEmoji !== undefined) {
      if (!isValidEmoji(profileEmoji)) {
        return NextResponse.json(
          { error: "Invalid profile emoji" },
          { status: 400 }
        )
      }
      updates.profileEmoji = profileEmoji === "" ? null : profileEmoji
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    const user = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(session.userId) },
      { $set: updates },
      { returnDocument: "after" }
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await createSession({
      userId: session.userId,
      email: session.email,
      displayName: user.displayName ?? session.displayName,
      role: session.role,
      groupId: session.groupId,
    })

    return NextResponse.json({
      success: true,
      user: {
        displayName: user.displayName,
        profileComplete: user.profileComplete,
        profileEmoji: user.profileEmoji || null,
      },
    })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
