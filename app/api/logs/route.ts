import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { safeObjectId } from "@/lib/objectid"
import { removeRedundantSkipsForLog } from "@/lib/streak"
import type { TrainingSlot } from "@/lib/streak"

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tags = searchParams.getAll("tag")
    const filterUserId = searchParams.get("userId") // Filter by specific athlete
    const filterRoleId = searchParams.get("roleId") // Filter by group role
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const filterCheckinId = searchParams.get("checkinId") // Filter by check-in session
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

    // Fetch current user to get groupId
    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })
    const userGroupId = currentUser?.groupId || null

    // Build filter: own logs + group logs (non-private) from same group
    let filter: Record<string, unknown>

    if (userGroupId) {
      // Get all members of the same group (support both old groupId and new groupIds)
      const groupMembers = await db
        .collection("users")
        .find({ $or: [{ groupIds: userGroupId }, { groupId: userGroupId }] })
        .project({ _id: 1 })
        .toArray()
      let memberIds = groupMembers.map((m) => m._id.toString())

      // Filter by role: restrict to athletes with that roleId
      if (filterRoleId && currentUser?.role === "coach") {
        const withRole = await db
          .collection("groupMemberships")
          .find({ groupId: userGroupId, roleIds: filterRoleId })
          .project({ userId: 1 })
          .toArray()
        const roleMemberIds = (withRole as { userId: string }[]).map((m) => m.userId)
        memberIds = memberIds.filter((id) => roleMemberIds.includes(id))
      }

      if (filterUserId && currentUser?.role === "coach" && memberIds.includes(filterUserId)) {
        // Coach filtering by specific athlete: show logs shared with coach
        // Support both new visibility field and legacy isGroup field
        filter = {
          userId: filterUserId,
          $or: [
            { visibility: "coach" },
            { visibility: { $exists: false }, isGroup: true },
          ],
        }
      } else if (currentUser?.role === "coach") {
        // Coach sees: own logs + group members' coach-shared logs
        filter = {
          $or: [
            { userId: session.userId },
            {
              userId: { $in: memberIds },
              $or: [
                { visibility: "coach" },
                { visibility: { $exists: false }, isGroup: true },
              ],
            },
          ],
        }
      } else {
        // Athlete sees only their own logs (all visibilities)
        filter = { userId: session.userId }
      }
    } else {
      filter = { userId: session.userId }
    }

    if (tags.length > 0) {
      filter.tags = { $all: tags }
    }

    // Check-in session filtering
    if (filterCheckinId) {
      filter.checkinId = filterCheckinId
    }

    // Date filtering
    if (dateFrom || dateTo) {
      const timestampFilter: Record<string, Date> = {}
      if (dateFrom) timestampFilter.$gte = new Date(dateFrom)
      if (dateTo) timestampFilter.$lte = new Date(dateTo)
      filter.timestamp = timestampFilter
    }

    // Cursor-based pagination: fetch documents before cursor (timestamp|id)
    if (cursor) {
      try {
        const sep = cursor.indexOf("|")
        const tsStr = sep >= 0 ? cursor.slice(0, sep) : ""
        const idStr = sep >= 0 ? cursor.slice(sep + 1) : ""
        const cursorTs = new Date(tsStr)
        const cursorId = safeObjectId(idStr)
        if (!Number.isNaN(cursorTs.getTime()) && cursorId) {
          const cursorCondition = {
            $or: [
              { timestamp: { $lt: cursorTs } },
              {
                timestamp: cursorTs,
                _id: { $lt: cursorId },
              },
            ],
          }
          filter = { $and: [filter, cursorCondition] }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

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
    let reviewMap = new Map<string, string>()
    if (currentUser?.role === "coach") {
      const logIds = logs.map((l) => l._id.toString())
      const reviews = await db
        .collection("log_reviews")
        .find({
          logId: { $in: logIds },
          coachId: session.userId,
        })
        .toArray()
      for (const r of reviews) {
        reviewMap.set(r.logId, r.status)
      }

      // Filter by review status when requested
      if (
        filterReviewStatus &&
        ["pending", "reviewed", "revisit"].includes(filterReviewStatus)
      ) {
        logs = logs.filter((log) => {
          const logId = log._id.toString()
          const status = reviewMap.get(logId) ?? "pending"
          return status === filterReviewStatus
        })
      }
    }

    // Fetch display names for all user IDs in the results
    const userIds = [...new Set(logs.map((l) => l.userId))]
    const users = await db
      .collection("users")
      .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
      .project({ password: 0 })
      .toArray()
    const userMap = new Map(
      users.map((u) => [u._id.toString(), u.displayName || "Unknown"])
    )

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
          // Normalize: new visibility field, with backward compat for legacy isGroup
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
      { status: 500 }
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
        { status: 400 }
      )
    }

    const db = await getDb()
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    // Determine visibility: prefer new visibility field, fall back to isGroup for backward compat
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

    // Link to check-in session if provided
    if (checkinId) {
      logEntry.checkinId = checkinId
    }

    const result = await db.collection("logs").insertOne(logEntry)

    const totalCount = await db
      .collection("logs")
      .countDocuments({ userId: session.userId })

    const logTimestamp = logEntry.timestamp as Date
    const trainingSlots = (user?.trainingSlots ?? []) as TrainingSlot[]
    await removeRedundantSkipsForLog(
      db,
      session.userId,
      logTimestamp,
      trainingSlots
    )

    // Save any new tags for the user
    const logTags = Array.isArray(logEntry.tags) ? logEntry.tags : []
    if (logTags.length > 0) {
      for (const tag of logTags) {
        await db.collection("tags").updateOne(
          { userId: session.userId, name: tag },
          {
            $set: { name: tag, userId: session.userId },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        )
      }
    }

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
      { status: 500 }
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

    // Only allow editing own logs
    const existing = await db.collection("logs").findOne({
      _id: logOid,
      userId: session.userId,
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Log not found or not authorized" },
        { status: 404 }
      )
    }

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (emoji !== undefined) update.emoji = emoji
    if (timestamp !== undefined) update.timestamp = new Date(timestamp)
    if (visibility !== undefined) update.visibility = visibility
    else if (isGroup !== undefined) update.visibility = isGroup ? "coach" : "private"
    if (notes !== undefined) update.notes = notes
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : []

    await db.collection("logs").updateOne(
      { _id: logOid },
      { $set: update }
    )

    // Upsert any new tags
    if (Array.isArray(tags) && tags.length > 0) {
      for (const tag of tags) {
        await db.collection("tags").updateOne(
          { userId: session.userId, name: tag },
          {
            $set: { name: tag, userId: session.userId },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update log error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
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
        { status: 400 }
      )
    }
    const deleteLogOid = safeObjectId(logId)
    if (!deleteLogOid) {
      return NextResponse.json({ error: "Invalid log ID" }, { status: 400 })
    }

    const db = await getDb()
    await db.collection("logs").deleteOne({
      _id: deleteLogOid,
      userId: session.userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete log error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
