import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { safeObjectId } from "@/lib/objectid"

// GET: fetch all announcements for the user's group
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

    const activeGroupId = user?.activeGroupId ?? (Array.isArray(user?.groupIds) ? user.groupIds[0] : null) ?? null
    if (!activeGroupId) {
      return NextResponse.json({ announcements: [] })
    }

    const activeGroupOid = safeObjectId(activeGroupId)
    if (!activeGroupOid) {
      return NextResponse.json({ announcements: [] })
    }
    const group = await db.collection("groups").findOne(
      { _id: activeGroupOid },
      { projection: { headCoachId: 1 } }
    )
    const groupHeadCoachId = group?.headCoachId ?? null

    const announcementQuery = groupHeadCoachId
      ? { $or: [{ groupId: activeGroupId }, { scope: "club", headCoachId: groupHeadCoachId }] }
      : { groupId: activeGroupId }

    const docs = await db
      .collection("announcements")
      .find(announcementQuery)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()

    const coachIdStrs = [...new Set(docs.map((d) => d.headCoachId).filter(Boolean))] as string[]
    const coachOids = coachIdStrs.map((id) => safeObjectId(id)).filter((id): id is ObjectId => id !== null)
    const coaches = await db
      .collection("users")
      .find({ _id: { $in: coachOids } })
      .project({ displayName: 1 })
      .toArray()
    const coachMap = new Map(
      coaches.map((c) => [c._id.toString(), c.displayName || "Coach"])
    )

    const announcements = docs.map((d) => ({
      id: d._id.toString(),
      text: d.text,
      coachName: coachMap.get(d.headCoachId) ?? "Coach",
      coachId: d.headCoachId,
      createdAt: d.createdAt,
      scope: d.scope ?? "group",
    }))

    return NextResponse.json({ announcements })
  } catch (error) {
    console.error("Get announcement error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// POST: coach creates a new announcement for their group
export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    if (!user || user.role !== "coach") {
      return NextResponse.json(
        { error: "Only coaches can post announcements" },
        { status: 403 }
      )
    }

    if (!user.activeGroupId) {
      return NextResponse.json(
        { error: "You must be in a group to post announcements" },
        { status: 400 }
      )
    }

    const { text, scope } = await req.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Announcement text is required" },
        { status: 400 }
      )
    }

    if (text.trim().length > 500) {
      return NextResponse.json(
        { error: "Announcement must be 500 characters or less" },
        { status: 400 }
      )
    }

    const announcementScope = scope === "club" ? "club" : "group"

    const result = await db.collection("announcements").insertOne({
      groupId: user.activeGroupId,
      headCoachId: session.userId,
      text: text.trim(),
      scope: announcementScope,
      active: true,
      createdAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      announcement: {
        id: result.insertedId.toString(),
        text: text.trim(),
        coachName: user.displayName || "Coach",
        coachId: session.userId,
        createdAt: new Date(),
      },
    })
  } catch (error) {
    console.error("Create announcement error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// DELETE: coach removes a specific announcement by id
export async function DELETE(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    if (!user || user.role !== "coach") {
      return NextResponse.json(
        { error: "Only coaches can remove announcements" },
        { status: 403 }
      )
    }

    if (!user.activeGroupId) {
      return NextResponse.json(
        { error: "You must be in a group" },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json(
        { error: "Announcement id is required" },
        { status: 400 }
      )
    }

    const oid = safeObjectId(id)
    if (!oid) {
      return NextResponse.json({ error: "Invalid announcement id" }, { status: 400 })
    }

    const announcement = await db.collection("announcements").findOne({ _id: oid })
    const isOwner = announcement?.headCoachId === session.userId &&
      (announcement?.groupId === user.activeGroupId || announcement?.scope === "club")
    if (!announcement || !isOwner) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      )
    }

    await db.collection("announcements").deleteOne({ _id: oid })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete announcement error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// PATCH: coach edits an announcement
export async function PATCH(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    if (!user || user.role !== "coach") {
      return NextResponse.json(
        { error: "Only coaches can edit announcements" },
        { status: 403 }
      )
    }

    if (!user.activeGroupId) {
      return NextResponse.json(
        { error: "You must be in a group" },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json(
        { error: "Announcement id is required" },
        { status: 400 }
      )
    }

    const oid = safeObjectId(id)
    if (!oid) {
      return NextResponse.json({ error: "Invalid announcement id" }, { status: 400 })
    }

    const { text } = await req.json()
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Announcement text is required" },
        { status: 400 }
      )
    }
    if (text.trim().length > 500) {
      return NextResponse.json(
        { error: "Announcement must be 500 characters or less" },
        { status: 400 }
      )
    }

    const announcement = await db.collection("announcements").findOne({ _id: oid })
    const isOwner = announcement?.headCoachId === session.userId &&
      (announcement?.groupId === user.activeGroupId || announcement?.scope === "club")
    if (!announcement || !isOwner) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      )
    }

    await db.collection("announcements").updateOne(
      { _id: oid },
      { $set: { text: text.trim() } }
    )

    return NextResponse.json({
      success: true,
      announcement: {
        id,
        text: text.trim(),
        coachName: user.displayName || "Coach",
        createdAt: announcement.createdAt,
      },
    })
  } catch (error) {
    console.error("Patch announcement error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
