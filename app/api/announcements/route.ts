import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

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

    if (!user?.groupId) {
      return NextResponse.json({ announcements: [] })
    }

    const docs = await db
      .collection("announcements")
      .find({ groupId: user.groupId })
      .sort({ createdAt: -1 })
      .toArray()

    const coachIds = [...new Set(docs.map((d) => d.coachId as string))]
    const coaches = await db
      .collection("users")
      .find({ _id: { $in: coachIds.map((id) => new ObjectId(id)) } })
      .toArray()
    const coachMap = new Map(
      coaches.map((c) => [c._id.toString(), c.displayName || "Coach"])
    )

    const announcements = docs.map((d) => ({
      id: d._id.toString(),
      text: d.text,
      coachName: coachMap.get(d.coachId) ?? "Coach",
      createdAt: d.createdAt,
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

    if (!user.groupId) {
      return NextResponse.json(
        { error: "You must be in a group to post announcements" },
        { status: 400 }
      )
    }

    const { text } = await req.json()

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

    const result = await db.collection("announcements").insertOne({
      groupId: user.groupId,
      coachId: session.userId,
      text: text.trim(),
      active: true,
      createdAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      announcement: {
        id: result.insertedId.toString(),
        text: text.trim(),
        coachName: user.displayName || "Coach",
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

    if (!user.groupId) {
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

    let oid: ObjectId
    try {
      oid = new ObjectId(id)
    } catch {
      return NextResponse.json({ error: "Invalid announcement id" }, { status: 400 })
    }

    const announcement = await db.collection("announcements").findOne({
      _id: oid,
      groupId: user.groupId,
    })
    if (!announcement) {
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

    if (!user.groupId) {
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

    let oid: ObjectId
    try {
      oid = new ObjectId(id)
    } catch {
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

    const announcement = await db.collection("announcements").findOne({
      _id: oid,
      groupId: user.groupId,
    })
    if (!announcement) {
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
