import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { safeObjectId } from "@/lib/objectid"

const VALID_STATUSES = ["pending", "reviewed", "revisit"] as const

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    if (currentUser?.role !== "coach") {
      return NextResponse.json(
        { error: "Only coaches can update review status" },
        { status: 403 }
      )
    }

    const { logId } = await params
    if (!logId) {
      return NextResponse.json(
        { error: "Log ID is required" },
        { status: 400 }
      )
    }
    const logOid = safeObjectId(logId)
    if (!logOid) {
      return NextResponse.json({ error: "Invalid log ID" }, { status: 400 })
    }

    const { status } = await req.json()
    if (
      !status ||
      !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
    ) {
      return NextResponse.json(
        { error: "Status must be pending, reviewed, or revisit" },
        { status: 400 }
      )
    }

    // Verify coach can access this log (must be coach-shared from their group)
    const log = await db.collection("logs").findOne({
      _id: logOid,
    })
    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 })
    }

    const visibility = log.visibility || (log.isGroup ? "coach" : "private")
    if (visibility !== "coach") {
      return NextResponse.json(
        { error: "Can only review coach-shared logs" },
        { status: 403 }
      )
    }

    const userGroupId = currentUser.groupId || null
    if (!userGroupId) {
      return NextResponse.json(
        { error: "Coach must belong to a group" },
        { status: 403 }
      )
    }

    const groupMembers = await db
      .collection("users")
      .find({ $or: [{ groupIds: userGroupId }, { groupId: userGroupId }] })
      .project({ _id: 1 })
      .toArray()
    const memberIds = groupMembers.map((m) => m._id.toString())

    if (log.userId !== session.userId && !memberIds.includes(log.userId)) {
      return NextResponse.json(
        { error: "Log is not from a member of your group" },
        { status: 403 }
      )
    }

    await db.collection("log_reviews").updateOne(
      { logId, coachId: session.userId },
      {
        $set: {
          logId,
          coachId: session.userId,
          status,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update review status error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    if (currentUser?.role !== "coach") {
      return NextResponse.json(
        { error: "Only coaches can fetch review status" },
        { status: 403 }
      )
    }

    const { logId } = await params
    if (!logId) {
      return NextResponse.json(
        { error: "Log ID is required" },
        { status: 400 }
      )
    }
    if (!safeObjectId(logId)) {
      return NextResponse.json({ error: "Invalid log ID" }, { status: 400 })
    }

    const review = await db.collection("log_reviews").findOne({
      logId,
      coachId: session.userId,
    })

    return NextResponse.json({
      status: review?.status ?? "pending",
    })
  } catch (error) {
    console.error("Get review status error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
