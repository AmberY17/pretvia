import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { safeObjectId } from "@/lib/objectid"

// GET: fetch check-ins for the user's group
export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()

    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    const userGroupId = currentUser?.groupId || null
    if (!userGroupId) {
      return NextResponse.json({ checkins: [] })
    }

    const { searchParams } = new URL(req.url)
    const mode = searchParams.get("mode")

    // For coaches: "all" mode returns all check-ins (including expired) for filtering
    // Default: only return active (non-expired) check-ins
    let filter: Record<string, unknown> = { groupId: userGroupId }
    if (mode !== "all") {
      filter.expiresAt = { $gt: new Date() }
    }

    const checkins = await db
      .collection("checkins")
      .find(filter)
      .sort({ sessionDate: -1 })
      .toArray()

    // Count athletes in the group (exclude coaches)
    const athletes = await db
      .collection("users")
      .find({
        $or: [{ groupIds: userGroupId }, { groupId: userGroupId }],
        role: { $ne: "coach" },
      })
      .project({ _id: 1 })
      .toArray()

    const totalAthletes = athletes.length

    // For each check-in, count how many unique athletes have logged for it
    const checkinIds = checkins.map((c) => c._id.toString())
    const logsForCheckins = await db
      .collection("logs")
      .find({ checkinId: { $in: checkinIds } })
      .project({ checkinId: 1, userId: 1 })
      .toArray()

    // Build a map of checkinId -> set of userIds who logged
    const checkinLogMap = new Map<string, Set<string>>()
    for (const log of logsForCheckins) {
      if (!checkinLogMap.has(log.checkinId)) {
        checkinLogMap.set(log.checkinId, new Set())
      }
      checkinLogMap.get(log.checkinId)!.add(log.userId)
    }

    // Check which check-ins the current user has already logged for
    const userLoggedCheckinIds = new Set<string>()
    for (const log of logsForCheckins) {
      if (log.userId === session.userId) {
        userLoggedCheckinIds.add(log.checkinId)
      }
    }

    return NextResponse.json({
      checkins: checkins.map((c) => ({
        id: c._id.toString(),
        groupId: c.groupId,
        coachId: c.coachId,
        title: c.title || null,
        sessionDate: c.sessionDate,
        createdAt: c.createdAt,
        expiresAt: c.expiresAt,
        checkedInCount: checkinLogMap.get(c._id.toString())?.size || 0,
        totalAthletes,
        hasUserLogged: userLoggedCheckinIds.has(c._id.toString()),
      })),
    })
  } catch (error) {
    console.error("Get checkins error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// POST: create a check-in (coach only)
export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()

    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    if (!currentUser || currentUser.role !== "coach") {
      return NextResponse.json(
        { error: "Only coaches can create check-ins" },
        { status: 403 }
      )
    }

    const userGroupId = currentUser.groupId
    if (!userGroupId) {
      return NextResponse.json(
        { error: "You must be in a group to create check-ins" },
        { status: 400 }
      )
    }

    const { sessionDate, title } = await req.json()

    if (!sessionDate) {
      return NextResponse.json(
        { error: "Session date is required" },
        { status: 400 }
      )
    }

    const sessionDateObj = new Date(sessionDate)
    const expiresAt = new Date(sessionDateObj.getTime() + 24 * 60 * 60 * 1000)

    const result = await db.collection("checkins").insertOne({
      groupId: userGroupId,
      coachId: session.userId,
      title: title?.trim() || null,
      sessionDate: sessionDateObj,
      createdAt: new Date(),
      expiresAt,
    })

    return NextResponse.json({
      success: true,
      checkin: {
        id: result.insertedId.toString(),
        groupId: userGroupId,
        coachId: session.userId,
        title: title?.trim() || null,
        sessionDate: sessionDateObj,
        createdAt: new Date(),
        expiresAt,
      },
    })
  } catch (error) {
    console.error("Create checkin error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// DELETE: remove a check-in (coach only)
export async function DELETE(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Check-in ID is required" },
        { status: 400 }
      )
    }
    const checkinOid = safeObjectId(id)
    if (!checkinOid) {
      return NextResponse.json({ error: "Invalid check-in ID" }, { status: 400 })
    }

    const db = await getDb()

    // Only the coach who created it can delete
    const result = await db.collection("checkins").deleteOne({
      _id: checkinOid,
      coachId: session.userId,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Check-in not found or not authorized" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete checkin error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
