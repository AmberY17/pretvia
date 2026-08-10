import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { safeObjectId } from "@/lib/objectid"
import { canManageGroup } from "@/lib/api-auth"
import { isLogVisibleToCoach } from "@/lib/log-filters"

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

    if (!isLogVisibleToCoach(log)) {
      return NextResponse.json(
        { error: "Can only review coach-shared logs" },
        { status: 403 }
      )
    }

    if (log.userId !== session.userId) {
      // Preferred check: the caller coaches the log's own group.
      let authorized =
        !!log.groupId &&
        (await canManageGroup(db, session.userId, log.groupId.toString()))

      // Fallback: the owner belongs to a group the caller coaches. Needed for
      // logs written before `groupId` existed, and for logs whose group has since
      // been deleted — group deletion leaves `logs.groupId` dangling (DB-audit
      // bug 7), and those logs must stay reviewable. Note this asks whether the
      // caller *coaches* the group, not merely belongs to it.
      if (!authorized) {
        const coachedGroups = await db
          .collection("groups")
          .find({
            $or: [{ headCoachId: session.userId }, { coachIds: session.userId }],
          })
          .project({ _id: 1 })
          .toArray()
        const coachedGroupIds = coachedGroups.map((g) => g._id.toString())

        const owner = await db
          .collection("users")
          .findOne(
            { _id: new ObjectId(log.userId) },
            { projection: { groupIds: 1 } }
          )
        const ownerGroupIds: string[] = Array.isArray(owner?.groupIds)
          ? owner.groupIds.flatMap((id: unknown) => (id == null ? [] : [id.toString()]))
          : []

        authorized = ownerGroupIds.some((id) => coachedGroupIds.includes(id))
      }

      if (!authorized) {
        return NextResponse.json(
          { error: "Log is not from a member of a group you coach" },
          { status: 403 }
        )
      }
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
