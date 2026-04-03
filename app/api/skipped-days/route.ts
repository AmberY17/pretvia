import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

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

    const allTrainingSlots = (user?.trainingSlots ?? []) as {
      dayOfWeek: number
      time: string
      sourceGroupId?: string
    }[]

    // Scope the skip to the active group's slots + personal (no sourceGroupId) slots.
    // This prevents a skip in one group from accidentally satisfying another group's
    // streak when both groups train on the same day.
    const trainingSlots = groupId
      ? allTrainingSlots.filter((s) => !s.sourceGroupId || s.sourceGroupId === groupId)
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

    const inserted: { date: Date; dayOfWeek: number; scheduledTime: string; reason: string }[] =
      []
    for (const slot of slotsToSkip) {
      const existing = await db.collection("skippedDays").findOne({
        userId: session.userId,
        date: targetDate,
        dayOfWeek: slot.dayOfWeek,
        scheduledTime: slot.time,
      })
      if (!existing) {
        await db.collection("skippedDays").insertOne({
          userId: session.userId,
          date: targetDate,
          dayOfWeek: slot.dayOfWeek,
          scheduledTime: slot.time,
          reason: reason.trim().slice(0, 200),
          createdAt: new Date(),
        })
        inserted.push({
          date: targetDate,
          dayOfWeek: slot.dayOfWeek,
          scheduledTime: slot.time,
          reason: reason.trim(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      skipped: inserted.length,
    })
  } catch (error) {
    console.error("Skip day error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
