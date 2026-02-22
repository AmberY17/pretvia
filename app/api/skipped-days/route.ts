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

    const { date, reason } = await req.json()

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

    const trainingSlots = (user?.trainingSlots ?? []) as {
      dayOfWeek: number
      time: string
    }[]

    const targetDate = new Date(date)
    const dayOfWeek = targetDate.getUTCDay()

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
