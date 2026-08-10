import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { TrainingSlotItem } from "@/types/dashboard"

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { date, reason, groupId } = await req.json()

    if (!date || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "Date and reason are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    // Every slot is group-scoped via sourceGroupId; filter strictly to the requested group.
    const allTrainingSlots = (user?.trainingSlots ?? []) as TrainingSlotItem[]
    const trainingSlots = groupId
      ? allTrainingSlots.filter((s) => s.sourceGroupId === groupId)
      : allTrainingSlots

    // Parse as local midnight (not UTC midnight) so getDay() returns the correct
    // local day of week matching the client-supplied date string.
    const targetDate = new Date(date + "T00:00:00")
    const dayOfWeek = targetDate.getDay()

    const slotsToSkip = trainingSlots.filter((s) => s.dayOfWeek === dayOfWeek)
    if (slotsToSkip.length === 0) {
      return NextResponse.json(
        { error: "No training slots scheduled for this day" },
        { status: 400 }
      )
    }

    // One round trip of upserts instead of a findOne + insertOne per slot. The
    // previous loop could double-insert a slot under a concurrent request, and
    // cost 2N queries; `$setOnInsert` keeps an existing skip's original reason.
    const trimmedReason = reason.trim().slice(0, 200)
    const result = await db.collection("skippedDays").bulkWrite(
      slotsToSkip.map((slot) => ({
        updateOne: {
          filter: {
            userId: session.userId,
            date: targetDate,
            dayOfWeek: slot.dayOfWeek,
            scheduledTime: slot.time,
          },
          update: {
            $setOnInsert: {
              userId: session.userId,
              date: targetDate,
              dayOfWeek: slot.dayOfWeek,
              scheduledTime: slot.time,
              reason: trimmedReason,
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    )

    return NextResponse.json({
      success: true,
      skipped: result.upsertedCount,
    })
  } catch (error) {
    console.error("Skip day error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
