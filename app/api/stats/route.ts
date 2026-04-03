import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { computeStreak, computeTodaySkipStatus } from "@/lib/streak"
import type { TrainingSlot } from "@/lib/streak"

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    // "YYYY-MM-DD" string in the user's local timezone, sent by the client.
    const localDate = searchParams.get("localDate") ?? undefined
    // Active group ID sent by the client — used to scope stats per group.
    const groupId = searchParams.get("groupId") ?? null

    const db = await getDb()
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    type StoredSlot = TrainingSlot & { sourceGroupId?: string; addedAt?: Date; removedAt?: Date }

    // Filter training slots and deleted slots to the active group + personal (no sourceGroupId).
    // This ensures streak and skip calculations are scoped to the group the athlete is viewing.
    const allTrainingSlots = (user?.trainingSlots ?? []) as StoredSlot[]
    const allDeletedSlots = (user?.deletedSlots ?? []) as StoredSlot[]
    const trainingSlots: TrainingSlot[] = groupId
      ? allTrainingSlots.filter((s) => !s.sourceGroupId || s.sourceGroupId === groupId)
      : allTrainingSlots
    const deletedSlots: TrainingSlot[] = groupId
      ? allDeletedSlots.filter((s) => !s.sourceGroupId || s.sourceGroupId === groupId)
      : allDeletedSlots

    // Build a group-scoped log filter. Include logs with no groupId for backward
    // compatibility so pre-migration history still counts toward the athlete's stats.
    const baseLogFilter: Record<string, unknown> = { userId: session.userId }
    if (groupId) {
      baseLogFilter.$or = [{ groupId }, { groupId: { $exists: false } }, { groupId: null }]
    }

    // Pre-fetch the logs window once and share it between computeStreak and
    // computeTodaySkipStatus to avoid two full log-collection scans per request.
    const now = new Date()
    const lookbackDate = new Date(now)
    lookbackDate.setDate(lookbackDate.getDate() - 100)
    const [totalLogs, prefetchedLogs, prefetchedSkips] = await Promise.all([
      db.collection("logs").countDocuments(baseLogFilter),
      db
        .collection("logs")
        .find({ ...baseLogFilter, timestamp: { $gte: lookbackDate } })
        .project({ timestamp: 1 })
        .sort({ timestamp: 1 })
        .toArray(),
      db
        .collection("skippedDays")
        .find({ userId: session.userId, date: { $gte: lookbackDate } })
        .project({ date: 1, dayOfWeek: 1, scheduledTime: 1 })
        .toArray(),
    ])

    const { streak } = await computeStreak(
      db,
      session.userId,
      trainingSlots,
      localDate,
      prefetchedLogs as { timestamp: Date | string }[],
      prefetchedSkips as { date: Date | string; dayOfWeek: number; scheduledTime: string }[],
      deletedSlots
    )
    const todaySkipStatus = await computeTodaySkipStatus(
      db,
      session.userId,
      trainingSlots,
      localDate,
      prefetchedLogs as { timestamp: Date | string }[],
      prefetchedSkips as { date: Date | string; dayOfWeek: number; scheduledTime: string }[]
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
