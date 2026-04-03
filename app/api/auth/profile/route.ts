import { NextResponse } from "next/server"
import { getSession, createSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { TrainingSlotItem } from "@/types/dashboard"

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
    const { displayName, profileEmoji, trainingSlots } = body

    const db = await getDb()
    const updates: Record<string, unknown> = { updatedAt: new Date() }

    if (trainingSlots !== undefined) {
      if (!Array.isArray(trainingSlots)) {
        return NextResponse.json(
          { error: "trainingSlots must be an array" },
          { status: 400 }
        )
      }
      const valid = trainingSlots.every(
        (s: unknown) =>
          s &&
          typeof s === "object" &&
          "dayOfWeek" in s &&
          "time" in s &&
          typeof (s as { dayOfWeek: unknown }).dayOfWeek === "number" &&
          typeof (s as { time: unknown }).time === "string"
      )
      if (!valid) {
        return NextResponse.json(
          { error: "Each slot must have dayOfWeek (0-6) and time (HH:mm)" },
          { status: 400 }
        )
      }

      const currentUser = await db.collection("users").findOne(
        { _id: new ObjectId(session.userId) },
        { projection: { trainingSlots: 1, deletedSlots: 1 } }
      )

      const now = new Date()
      const existingByKey = new Map<string, TrainingSlotItem>(
        ((currentUser?.trainingSlots ?? []) as TrainingSlotItem[]).map(
          (s) => [`${s.dayOfWeek}:${s.time}`, s]
        )
      )
      const submittedKeys = new Set(
        trainingSlots.map((s: { dayOfWeek: number; time: string }) => `${s.dayOfWeek}:${s.time}`)
      )

      updates.trainingSlots = trainingSlots.map(
        (s: TrainingSlotItem) => {
          const t = String(s.time).trim()
          const match = t.match(/^(\d{1,2}):(\d{2})$/)
          const time = match
            ? `${match[1].padStart(2, "0")}:${match[2]}`
            : "09:00"
          const dayOfWeek = Math.max(0, Math.min(6, Number(s.dayOfWeek) || 0))
          const existing = existingByKey.get(`${dayOfWeek}:${time}`)
          const addedAt = existing?.addedAt ?? now
          const base: TrainingSlotItem = { dayOfWeek, time, addedAt }
          return s.sourceGroupId
            ? { ...base, sourceGroupId: String(s.sourceGroupId) }
            : base
        }
      )

      const nowDeleted = [...existingByKey.entries()]
        .filter(([key]) => !submittedKeys.has(key))
        .map(([, slot]) => ({ ...slot, removedAt: now }))
      updates.deletedSlots = [...((currentUser?.deletedSlots ?? []) as TrainingSlotItem[]), ...nowDeleted]
    }

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
      activeGroupId: session.activeGroupId,
    })

    return NextResponse.json({
      success: true,
      user: {
        displayName: user.displayName,
        profileComplete: user.profileComplete,
        profileEmoji: user.profileEmoji || null,
        trainingSlots: user.trainingSlots ?? [],
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
