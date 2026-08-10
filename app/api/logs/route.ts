import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { safeObjectId } from "@/lib/objectid"
import { removeRedundantSkipsForLog } from "@/lib/streak"
import type { TrainingSlotItem } from "@/types/dashboard"
import {
  buildVisibilityFilter,
  applyDateFilter,
  applyCursorFilter,
  buildReviewStatusMap,
  fetchUserDisplayNames,
} from "@/lib/log-filters"
import { apiRateLimiter, getIp } from "@/lib/rate-limit"
import { logCreateSchema, logUpdateSchema, validationError } from "@/lib/validation"

/**
 * Day component of a log's daily-limit key, in server-local time — the same
 * notion of "today" the limit's read-check has always used.
 *
 * TODO (Phase 6, timezone unification): this should be the *user's* local day.
 * Changing it requires recomputing `limitKey` on existing logs via a migration.
 */
function serverLocalDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * The value behind the partial unique index that enforces one shared and one
 * private log per user per group per day.
 *
 * It exists only on standalone logs: check-in logs are exempt from the limit, and
 * a partialFilterExpression cannot express `checkinId: { $exists: false }` (only
 * `$exists: true` is supported), so presence of this field is what scopes the
 * index instead.
 */
function dailyLimitKey(day: string, visibility: string): string {
  return `${day}:${visibility}`
}

/** Duplicate key on the daily-limit index, as opposed to any other unique index. */
function isDailyLimitCollision(err: unknown): boolean {
  const e = err as { code?: number; keyPattern?: Record<string, unknown> }
  return e?.code === 11000 && e?.keyPattern?.limitKey !== undefined
}

function dailyLimitError(visibility: string): NextResponse {
  return NextResponse.json(
    {
      error:
        visibility === "coach"
          ? "Daily shared log limit reached"
          : "Daily private log limit reached",
    },
    { status: 409 },
  )
}

export async function GET(req: Request) {
  try {
    if (apiRateLimiter) {
      const { success } = await apiRateLimiter.limit(getIp(req))
      if (!success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 })
      }
    }

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tags = searchParams.getAll("tag")
    const filterUserIds = searchParams.getAll("userId")
    const filterRoleIds = searchParams.getAll("roleId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const datesParam = searchParams.get("dates")
    const filterCheckinIds = searchParams.getAll("checkinId")
    const filterVisibility = searchParams.get("visibility")
    const filterReviewStatuses = searchParams
      .getAll("reviewStatus")
      .filter((s) => ["pending", "reviewed", "revisit"].includes(s)) as (
      | "pending"
      | "reviewed"
      | "revisit"
    )[]
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)), 50)
    const cursor = searchParams.get("cursor") ?? null

    const db = await getDb()

    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })
    const userGroupId = currentUser?.activeGroupId || null

    // Build filter pipeline
    let filter = await buildVisibilityFilter(db, {
      userId: session.userId,
      userRole: currentUser?.role,
      userGroupId,
      filterUserIds,
      filterRoleIds,
    })

    if (tags.length > 0) {
      filter.tags = { $all: tags }
    }
    if (filterCheckinIds.length > 0) {
      filter.checkinId =
        filterCheckinIds.length === 1 ? filterCheckinIds[0] : { $in: filterCheckinIds }
    }

    filter = applyDateFilter(filter, dateFrom, dateTo, datesParam)
    filter = applyCursorFilter(filter, cursor)

    if (filterVisibility && currentUser?.role !== "coach") {
      if (filterVisibility === "coach") {
        filter = {
          $and: [
            filter,
            { $or: [{ visibility: "coach" }, { visibility: { $exists: false }, isGroup: true }] },
          ],
        }
      } else if (filterVisibility === "private") {
        filter = {
          $and: [
            filter,
            {
              $or: [
                { visibility: "private" },
                { visibility: { $exists: false }, isGroup: { $ne: true } },
              ],
            },
          ],
        }
      }
    }

    const useAggregation = currentUser?.role === "coach" && filterReviewStatuses.length > 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let logs: any[]
    let nextCursor: string | null = null
    const reviewMap = new Map<string, string>()

    if (useAggregation) {
      // Use aggregation pipeline to filter by review status in the DB
      const pipeline = [
        { $match: filter },
        { $addFields: { _idStr: { $toString: "$_id" } } },
        {
          $lookup: {
            from: "log_reviews",
            let: { logIdStr: "$_idStr" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$logId", "$$logIdStr"] },
                      { $eq: ["$coachId", session.userId] },
                    ],
                  },
                },
              },
            ],
            as: "_reviews",
          },
        },
        {
          $addFields: {
            _reviewStatus: {
              $ifNull: [{ $arrayElemAt: ["$_reviews.status", 0] }, "pending"],
            },
          },
        },
        { $match: { _reviewStatus: { $in: filterReviewStatuses } } },
        { $sort: { timestamp: -1 as const, _id: -1 as const } },
        { $limit: limit + 1 },
      ]

      logs = await db.collection("logs").aggregate(pipeline).toArray()

      if (logs.length > limit) {
        const last = logs[limit - 1] as { timestamp: Date; _id: ObjectId }
        nextCursor = `${last.timestamp.toISOString()}|${last._id.toString()}`
        logs = logs.slice(0, limit)
      }

      // Populate reviewMap from aggregation results
      for (const log of logs) {
        reviewMap.set((log._id as ObjectId).toString(), (log._reviewStatus as string) ?? "pending")
      }
    } else {
      logs = await db
        .collection("logs")
        .find(filter)
        .sort({ timestamp: -1, _id: -1 })
        .limit(limit + 1)
        .toArray()

      if (logs.length > limit) {
        const last = logs[limit - 1] as { timestamp: Date; _id: ObjectId }
        nextCursor = `${last.timestamp.toISOString()}|${last._id.toString()}`
        logs = logs.slice(0, limit)
      }

      // Coach-only: fetch review status for default ordering
      if (currentUser?.role === "coach") {
        const logIds = logs.map((l) => (l._id as ObjectId).toString())
        const map = await buildReviewStatusMap(db, logIds, session.userId)
        for (const [k, v] of map) reviewMap.set(k, v)

        const statusOrder: Record<string, number> = { pending: 0, revisit: 1, reviewed: 2 }
        logs.sort((a, b) => {
          const aOrder =
            statusOrder[reviewMap.get((a._id as ObjectId).toString()) ?? "pending"] ?? 0
          const bOrder =
            statusOrder[reviewMap.get((b._id as ObjectId).toString()) ?? "pending"] ?? 0
          if (aOrder !== bOrder) return aOrder - bOrder
          return (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime()
        })
      }
    }

    const userIds = [...new Set(logs.map((l) => l.userId as string))]
    const userMap = await fetchUserDisplayNames(db, userIds)

    return NextResponse.json({
      logs: logs.map((log) => {
        const logId = (log._id as ObjectId).toString()
        const reviewStatus =
          currentUser?.role === "coach" ? (reviewMap.get(logId) ?? "pending") : undefined
        return {
          id: logId,
          emoji: log.emoji,
          timestamp: log.timestamp,
          visibility: log.visibility || (log.isGroup ? "coach" : "private"),
          notes: log.notes,
          tags: log.tags || [],
          userId: log.userId,
          userName: userMap.get(log.userId) || "Unknown",
          isOwn: log.userId === session.userId,
          checkinId: log.checkinId || null,
          createdAt: log.createdAt,
          ...(reviewStatus !== undefined && { reviewStatus }),
        }
      }),
      ...(nextCursor !== null && { nextCursor }),
    })
  } catch (error) {
    console.error("Get logs error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (apiRateLimiter) {
      const { success } = await apiRateLimiter.limit(getIp(req))
      if (!success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 })
      }
    }

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parsed = logCreateSchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)
    const { emoji, timestamp, isGroup, visibility, notes, tags, checkinId } = parsed.data

    const db = await getDb()
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    // Enforce daily log limit for standalone logs (not checkin logs).
    // The limit is per group — athletes in multiple groups each get one shared
    // and one private log per day per group.
    if (!checkinId) {
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const todayLogFilter: Record<string, unknown> = {
        userId: session.userId,
        createdAt: { $gte: startOfToday, $lt: endOfToday },
        checkinId: { $exists: false },
      }
      if (user?.activeGroupId) {
        todayLogFilter.groupId = user.activeGroupId
      }
      const todayLogs = await db
        .collection("logs")
        .find(todayLogFilter)
        .project({ visibility: 1, isGroup: 1 })
        .toArray()

      const resolvedNew = visibility || (isGroup ? "coach" : "private")
      const hasShared = todayLogs.some(
        (l) => l.visibility === "coach" || (!l.visibility && l.isGroup === true),
      )
      const hasPrivate = todayLogs.some(
        (l) => l.visibility === "private" || (!l.visibility && l.isGroup !== true),
      )

      if (resolvedNew === "coach" && hasShared) {
        return NextResponse.json({ error: "Daily shared log limit reached" }, { status: 409 })
      }
      if (resolvedNew === "private" && hasPrivate) {
        return NextResponse.json({ error: "Daily private log limit reached" }, { status: 409 })
      }
    }

    const resolvedVisibility = visibility || (isGroup ? "coach" : "private")

    const logEntry: Record<string, unknown> = {
      userId: session.userId,
      groupId: user?.activeGroupId ?? null,
      emoji,
      timestamp: timestamp ?? new Date(),
      visibility: resolvedVisibility,
      notes: notes ?? "",
      tags: tags ?? [],
      createdAt: new Date(),
    }

    if (checkinId && typeof checkinId === "string") {
      const oid = safeObjectId(checkinId)
      if (oid) logEntry.checkinId = checkinId
    }

    // Only standalone logs are subject to the daily limit, and only they carry the
    // key the partial unique index is built on.
    if (!logEntry.checkinId) {
      logEntry.limitKey = dailyLimitKey(serverLocalDayKey(new Date()), resolvedVisibility)
    }

    let result
    try {
      result = await db.collection("logs").insertOne(logEntry)
    } catch (err) {
      // The read-check above already rejects the common case with a friendly
      // error; this catches the race it cannot close, where two submissions both
      // read "no log yet" before either inserts.
      if (isDailyLimitCollision(err)) return dailyLimitError(resolvedVisibility)
      throw err
    }

    const totalCount = await db.collection("logs").countDocuments({ userId: session.userId })

    const logTimestamp = logEntry.timestamp as Date
    const logGroupId = logEntry.groupId as string | null
    const allTrainingSlots = (user?.trainingSlots ?? []) as TrainingSlotItem[]
    const trainingSlots = logGroupId
      ? allTrainingSlots.filter((s) => s.sourceGroupId === logGroupId)
      : allTrainingSlots
    await removeRedundantSkipsForLog(db, session.userId, logTimestamp, trainingSlots)

    const logTags = Array.isArray(logEntry.tags) ? logEntry.tags : []

    return NextResponse.json({
      success: true,
      log: {
        id: result.insertedId.toString(),
        emoji: logEntry.emoji,
        timestamp: logEntry.timestamp,
        visibility: logEntry.visibility,
        notes: logEntry.notes,
        tags: logTags,
        userId: logEntry.userId,
        checkinId: logEntry.checkinId || null,
        userName: session.displayName || "Unknown",
        isOwn: true,
        createdAt: logEntry.createdAt,
      },
      totalCount,
    })
  } catch (error) {
    console.error("Create log error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    if (apiRateLimiter) {
      const { success } = await apiRateLimiter.limit(getIp(req))
      if (!success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 })
      }
    }

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rawBody = await req.json()
    const { id } = rawBody as { id?: unknown }

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Log ID is required" }, { status: 400 })
    }

    const parsed = logUpdateSchema.safeParse(rawBody)
    if (!parsed.success) return validationError(parsed.error)
    const { emoji, timestamp, isGroup, visibility, notes, tags } = parsed.data
    const logOid = safeObjectId(id)
    if (!logOid) {
      return NextResponse.json({ error: "Invalid log ID" }, { status: 400 })
    }

    const db = await getDb()

    const existing = await db.collection("logs").findOne({
      _id: logOid,
      userId: session.userId,
    })

    if (!existing) {
      return NextResponse.json({ error: "Log not found or not authorized" }, { status: 404 })
    }

    const resolvedNewVisibility =
      visibility !== undefined
        ? visibility
        : isGroup !== undefined
          ? isGroup
            ? "coach"
            : "private"
          : null

    const existingVisibility = existing.visibility || (existing.isGroup ? "coach" : "private")

    if (
      resolvedNewVisibility &&
      resolvedNewVisibility !== existingVisibility &&
      !existing.checkinId
    ) {
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

      const conflictLog = await db.collection("logs").findOne({
        _id: { $ne: logOid },
        userId: session.userId,
        createdAt: { $gte: startOfToday, $lt: endOfToday },
        checkinId: { $exists: false },
        // Scope the conflict check to the same group as the log being edited
        ...(existing.groupId ? { groupId: existing.groupId } : {}),
        $or:
          resolvedNewVisibility === "coach"
            ? [{ visibility: "coach" }, { visibility: { $exists: false }, isGroup: true }]
            : [
                { visibility: "private" },
                { visibility: { $exists: false }, isGroup: { $ne: true } },
              ],
      })

      if (conflictLog) {
        return NextResponse.json(
          {
            error:
              resolvedNewVisibility === "coach"
                ? "Daily shared log limit reached"
                : "Daily private log limit reached",
          },
          { status: 409 },
        )
      }
    }

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (emoji !== undefined) update.emoji = emoji
    if (timestamp !== undefined) update.timestamp = timestamp
    if (visibility !== undefined) update.visibility = visibility
    else if (isGroup !== undefined) update.visibility = isGroup ? "coach" : "private"
    if (notes !== undefined) update.notes = notes
    if (tags !== undefined) update.tags = tags

    // Keep the daily-limit key in step with a visibility change, otherwise a log
    // edited from private to shared would sit outside the index's guarantee.
    // Logs predating the key are left without one — the read-check still covers them.
    if (update.visibility !== undefined && typeof existing.limitKey === "string") {
      const day = existing.limitKey.split(":")[0]
      update.limitKey = dailyLimitKey(day, update.visibility as string)
    }

    try {
      await db.collection("logs").updateOne({ _id: logOid }, { $set: update })
    } catch (err) {
      if (isDailyLimitCollision(err)) {
        return dailyLimitError((update.visibility as string) ?? existingVisibility)
      }
      throw err
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update log error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    if (apiRateLimiter) {
      const { success } = await apiRateLimiter.limit(getIp(req))
      if (!success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 })
      }
    }

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const logId = searchParams.get("id")

    if (!logId) {
      return NextResponse.json({ error: "Log ID is required" }, { status: 400 })
    }
    const deleteLogOid = safeObjectId(logId)
    if (!deleteLogOid) {
      return NextResponse.json({ error: "Invalid log ID" }, { status: 400 })
    }

    const db = await getDb()

    const result = await db.collection("logs").deleteOne({
      _id: deleteLogOid,
      userId: session.userId,
    })
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Log not found or not authorized" }, { status: 404 })
    }

    await Promise.all([
      db.collection("comments").deleteMany({ logId }),
      db.collection("comment_reads").deleteMany({ logId }),
      db.collection("log_reviews").deleteMany({ logId }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete log error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
