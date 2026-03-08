import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { safeObjectId } from "@/lib/objectid"
import { removeRedundantSkipsForLog } from "@/lib/streak"
import type { TrainingSlot } from "@/lib/streak"
import {
  buildVisibilityFilter,
  applyDateFilter,
  applyCursorFilter,
  buildReviewStatusMap,
  fetchUserDisplayNames,
} from "@/lib/log-filters"

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tags = searchParams.getAll("tag")
    const filterUserId = searchParams.get("userId")
    const filterRoleId = searchParams.get("roleId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const datesParam = searchParams.get("dates")
    const filterCheckinId = searchParams.get("checkinId")
    const filterReviewStatus = searchParams.get("reviewStatus") as
      | "pending"
      | "reviewed"
      | "revisit"
      | null
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)),
      50,
    )
    const cursor = searchParams.get("cursor") ?? null

    const db = await getDb()

    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })
    const userGroupId = currentUser?.groupId || null

    // Build filter pipeline
    let filter = await buildVisibilityFilter(db, {
      userId: session.userId,
      userRole: currentUser?.role,
      userGroupId,
      filterUserId,
      filterRoleId,
    })

    if (tags.length > 0) {
      filter.tags = { $all: tags }
    }
    if (filterCheckinId) {
      filter.checkinId = filterCheckinId
    }

    filter = applyDateFilter(filter, dateFrom, dateTo, datesParam)
    filter = applyCursorFilter(filter, cursor)

    let logs = await db
      .collection("logs")
      .find(filter)
      .sort({ timestamp: -1, _id: -1 })
      .limit(limit + 1)
      .toArray()

    let nextCursor: string | null = null
    if (logs.length > limit) {
      const last = logs[limit - 1] as { timestamp: Date; _id: ObjectId }
      nextCursor = `${last.timestamp.toISOString()}|${last._id.toString()}`
      logs = logs.slice(0, limit)
    }

    // Coach-only: fetch review status and optionally filter by it
    const reviewMap = new Map<string, string>()
    if (currentUser?.role === "coach") {
      const logIds = logs.map((l) => l._id.toString())
      const map = await buildReviewStatusMap(db, logIds, session.userId)
      for (const [k, v] of map) reviewMap.set(k, v)

      if (
        filterReviewStatus &&
        ["pending", "reviewed", "revisit"].includes(filterReviewStatus)
      ) {
        logs = logs.filter((log) => {
          const status = reviewMap.get(log._id.toString()) ?? "pending"
          return status === filterReviewStatus
        })
        if (logs.length < limit) {
          nextCursor = null
        } else {
          const lastFiltered = logs[limit - 1] as { timestamp: Date; _id: ObjectId }
          nextCursor = `${lastFiltered.timestamp.toISOString()}|${lastFiltered._id.toString()}`
        }
      }
    }

    const userIds = [...new Set(logs.map((l) => l.userId))]
    const userMap = await fetchUserDisplayNames(db, userIds)

    return NextResponse.json({
      logs: logs.map((log) => {
        const logId = log._id.toString()
        const reviewStatus =
          currentUser?.role === "coach"
            ? (reviewMap.get(logId) ?? "pending")
            : undefined
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
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emoji, timestamp, isGroup, visibility, notes, tags, checkinId } = await req.json()

    if (!emoji) {
      return NextResponse.json(
        { error: "An emoji is required" },
        { status: 400 },
      )
    }

    const db = await getDb()
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    const resolvedVisibility = visibility || (isGroup ? "coach" : "private")

    const logEntry: Record<string, unknown> = {
      userId: session.userId,
      emoji,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      visibility: resolvedVisibility,
      notes: notes || "",
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date(),
    }

    if (checkinId && typeof checkinId === "string") {
      const oid = safeObjectId(checkinId)
      if (oid) logEntry.checkinId = checkinId
    }

    const result = await db.collection("logs").insertOne(logEntry)

    const totalCount = await db
      .collection("logs")
      .countDocuments({ userId: session.userId })

    const logTimestamp = logEntry.timestamp as Date
    const trainingSlots = (user?.trainingSlots ?? []) as TrainingSlot[]
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
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    )
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, emoji, timestamp, isGroup, visibility, notes, tags } = await req.json()

    if (!id) {
      return NextResponse.json({ error: "Log ID is required" }, { status: 400 })
    }
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
      return NextResponse.json(
        { error: "Log not found or not authorized" },
        { status: 404 },
      )
    }

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (emoji !== undefined) update.emoji = emoji
    if (timestamp !== undefined) update.timestamp = new Date(timestamp)
    if (visibility !== undefined) update.visibility = visibility
    else if (isGroup !== undefined) update.visibility = isGroup ? "coach" : "private"
    if (notes !== undefined) update.notes = notes
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : []

    await db.collection("logs").updateOne({ _id: logOid }, { $set: update })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update log error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const logId = searchParams.get("id")

    if (!logId) {
      return NextResponse.json(
        { error: "Log ID is required" },
        { status: 400 },
      )
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
      return NextResponse.json(
        { error: "Log not found or not authorized" },
        { status: 404 },
      )
    }

    await Promise.all([
      db.collection("comments").deleteMany({ logId }),
      db.collection("comment_reads").deleteMany({ logId }),
      db.collection("log_reviews").deleteMany({ logId }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete log error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    )
  }
}
