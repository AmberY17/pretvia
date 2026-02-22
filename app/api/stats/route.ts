import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { computeStreak, computeTodaySkipStatus } from "@/lib/streak"
import type { TrainingSlot } from "@/lib/streak"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    const totalLogs = await db
      .collection("logs")
      .countDocuments({ userId: session.userId })

    const trainingSlots = (user?.trainingSlots ?? []) as TrainingSlot[]
    const { streak } = await computeStreak(
      db,
      session.userId,
      trainingSlots
    )
    const todaySkipStatus = await computeTodaySkipStatus(
      db,
      session.userId,
      trainingSlots
    )

    return NextResponse.json({
      totalLogs,
      streak,
      hasTrainingSlots: trainingSlots.length > 0,
      canSkipToday: todaySkipStatus.canSkipToday,
      skipDisabledReason: todaySkipStatus.skipDisabledReason,
    })
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
