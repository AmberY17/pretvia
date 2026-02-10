import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// GET: fetch the latest pinned announcement for the user's group
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
      return NextResponse.json({ announcement: null })
    }

    // Get the most recent active announcement for this group
    const announcement = await db
      .collection("announcements")
      .findOne(
        { groupId: user.groupId, active: true },
        { sort: { createdAt: -1 } }
      )

    if (!announcement) {
      return NextResponse.json({ announcement: null })
    }

    // Fetch coach display name
    const coach = await db.collection("users").findOne({
      _id: new ObjectId(announcement.coachId),
    })

    return NextResponse.json({
      announcement: {
        id: announcement._id.toString(),
        text: announcement.text,
        coachName: coach?.displayName || "Coach",
        createdAt: announcement.createdAt,
      },
    })
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

    // Deactivate all previous announcements for this group
    await db.collection("announcements").updateMany(
      { groupId: user.groupId, active: true },
      { $set: { active: false } }
    )

    // Create new announcement
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

// DELETE: coach removes their group's active announcement
export async function DELETE() {
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

    await db.collection("announcements").updateMany(
      { groupId: user.groupId, active: true },
      { $set: { active: false } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete announcement error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
