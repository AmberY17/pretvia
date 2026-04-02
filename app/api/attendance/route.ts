import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { safeObjectId } from "@/lib/objectid"

// GET: fetch attendance for a check-in
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

    if (!currentUser || currentUser.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const userGroupId = currentUser.activeGroupId ?? (Array.isArray(currentUser.groupIds) ? currentUser.groupIds[0] : null) ?? null
    if (!userGroupId) {
      return NextResponse.json({ attendance: null, athletes: [] })
    }

    const { searchParams } = new URL(req.url)
    const checkinId = searchParams.get("checkinId")

    if (!checkinId) {
      return NextResponse.json({ attendance: null, athletes: [] })
    }

    const checkinOid = safeObjectId(checkinId)
    if (!checkinOid) {
      return NextResponse.json({ error: "Invalid checkin ID" }, { status: 400 })
    }

    const checkin = await db.collection("checkins").findOne({
      _id: checkinOid,
      groupId: userGroupId,
    })

    if (!checkin) {
      return NextResponse.json({ attendance: null, athletes: [] })
    }

    const athletes = await db
      .collection("users")
      .find({
        $or: [{ groupIds: userGroupId }, { groupId: userGroupId }],
        role: { $ne: "coach" },
      })
      .project({ password: 0 })
      .sort({ displayName: 1 })
      .toArray()

    const attendance = await db.collection("attendance").findOne({
      checkinId,
      groupId: userGroupId,
    })

    const entries = attendance?.entries ?? []
    const entryMap = new Map(
      entries.map((e: { userId: string; status: string }) => [e.userId, e.status])
    )

    return NextResponse.json({
      attendance: attendance
        ? {
            id: attendance._id.toString(),
            checkinId: attendance.checkinId,
            groupId: attendance.groupId,
            entries: attendance.entries,
          }
        : null,
      athletes: athletes.map((a) => ({
        id: a._id.toString(),
        displayName: a.displayName || a.email,
        email: a.email,
        status: entryMap.get(a._id.toString()) ?? null,
      })),
      checkin: {
        id: checkin._id.toString(),
        title: checkin.title,
        sessionDate: checkin.sessionDate,
      },
    })
  } catch (error) {
    console.error("Get attendance error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// POST: create or update attendance for a check-in
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
        { error: "Only coaches can record attendance" },
        { status: 403 }
      )
    }

    const userGroupId = currentUser.activeGroupId ?? (Array.isArray(currentUser.groupIds) ? currentUser.groupIds[0] : null) ?? null
    if (!userGroupId) {
      return NextResponse.json(
        { error: "You must be in a group to record attendance" },
        { status: 400 }
      )
    }

    const { checkinId, entries } = await req.json()

    if (!checkinId || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: "checkinId and entries array are required" },
        { status: 400 }
      )
    }

    const checkinOid = safeObjectId(checkinId)
    if (!checkinOid) {
      return NextResponse.json({ error: "Invalid checkin ID" }, { status: 400 })
    }

    const checkin = await db.collection("checkins").findOne({
      _id: checkinOid,
      groupId: userGroupId,
    })

    if (!checkin) {
      return NextResponse.json(
        { error: "Check-in not found" },
        { status: 404 }
      )
    }

    const validEntries = entries
      .filter(
        (e: { userId?: string; status?: string }) =>
          e?.userId &&
          ["present", "absent", "excused"].includes(e?.status ?? "")
      )
      .map((e: { userId: string; status: string }) => ({
        userId: e.userId,
        status: e.status,
      }))

    const doc = {
      checkinId,
      groupId: userGroupId,
      sessionDate: checkin.sessionDate,
      entries: validEntries,
      coachId: session.userId,
      updatedAt: new Date(),
    }

    const existing = await db.collection("attendance").findOne({
      checkinId,
      groupId: userGroupId,
    })

    if (existing) {
      await db.collection("attendance").updateOne(
        { _id: existing._id },
        { $set: doc }
      )
      return NextResponse.json({
        success: true,
        attendance: {
          id: existing._id.toString(),
          checkinId,
          entries: validEntries,
        },
      })
    }

    const result = await db.collection("attendance").insertOne({
      ...doc,
      createdAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      attendance: {
        id: result.insertedId.toString(),
        checkinId,
        entries: validEntries,
      },
    })
  } catch (error) {
    console.error("Save attendance error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
