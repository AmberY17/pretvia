import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// GET: fetch comments for a specific log
// Only the log owner and coaches in the same group can view comments
export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const logId = searchParams.get("logId")

    if (!logId) {
      return NextResponse.json(
        { error: "Log ID is required" },
        { status: 400 }
      )
    }

    const db = await getDb()

    // Verify the log exists
    const log = await db.collection("logs").findOne({
      _id: new ObjectId(logId),
    })

    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 })
    }

    // Fetch current user
    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const isLogOwner = log.userId === session.userId
    const isCoach = currentUser.role === "coach"

    // Only log owner or a coach in the same group can see comments
    if (!isLogOwner && !isCoach) {
      return NextResponse.json({ comments: [] })
    }

    // Check they share a group
    if (!isLogOwner) {
      const logOwner = await db.collection("users").findOne({
        _id: new ObjectId(log.userId),
      })
      if (!logOwner || logOwner.groupId !== currentUser.groupId) {
        return NextResponse.json({ comments: [] })
      }
    }

    // Fetch comments for this log, between the log owner and the coach
    const comments = await db
      .collection("comments")
      .find({ logId })
      .sort({ createdAt: 1 })
      .toArray()

    // Fetch display names
    const authorIds = [...new Set(comments.map((c) => c.authorId))]
    const authors = await db
      .collection("users")
      .find({ _id: { $in: authorIds.map((id) => new ObjectId(id)) } })
      .project({ password: 0 })
      .toArray()
    const authorMap = new Map(
      authors.map((a) => [
        a._id.toString(),
        { displayName: a.displayName || "Unknown", role: a.role || "athlete" },
      ])
    )

    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c._id.toString(),
        logId: c.logId,
        authorId: c.authorId,
        authorName: authorMap.get(c.authorId)?.displayName || "Unknown",
        authorRole: authorMap.get(c.authorId)?.role || "athlete",
        text: c.text,
        createdAt: c.createdAt,
      })),
    })
  } catch (error) {
    console.error("Get comments error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// POST: add a comment to a log
// Only coaches and the log owner can comment (1-on-1 conversation)
export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { logId, text } = await req.json()

    if (!logId) {
      return NextResponse.json(
        { error: "Log ID is required" },
        { status: 400 }
      )
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      )
    }

    if (text.trim().length > 1000) {
      return NextResponse.json(
        { error: "Comment must be 1000 characters or less" },
        { status: 400 }
      )
    }

    const db = await getDb()

    // Verify the log exists
    const log = await db.collection("logs").findOne({
      _id: new ObjectId(logId),
    })

    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 })
    }

    // Fetch current user
    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const isLogOwner = log.userId === session.userId
    const isCoach = currentUser.role === "coach"

    // Only the log owner or a coach in the same group can comment
    if (!isLogOwner && !isCoach) {
      return NextResponse.json(
        { error: "Only the log owner or a coach can comment" },
        { status: 403 }
      )
    }

    // If coach, verify they are in the same group as the log owner
    if (isCoach && !isLogOwner) {
      const logOwner = await db.collection("users").findOne({
        _id: new ObjectId(log.userId),
      })
      if (!logOwner || logOwner.groupId !== currentUser.groupId) {
        return NextResponse.json(
          { error: "You can only comment on logs from your group members" },
          { status: 403 }
        )
      }
    }

    const result = await db.collection("comments").insertOne({
      logId,
      authorId: session.userId,
      text: text.trim(),
      createdAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      comment: {
        id: result.insertedId.toString(),
        logId,
        authorId: session.userId,
        authorName: currentUser.displayName || "Unknown",
        authorRole: currentUser.role || "athlete",
        text: text.trim(),
        createdAt: new Date(),
      },
    })
  } catch (error) {
    console.error("Create comment error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
