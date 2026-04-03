import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get("groupId") ?? null

    const db = await getDb()

    // Build a group-scoped match. Include logs with no groupId for backward
    // compatibility so pre-migration tags are still surfaced.
    const matchFilter: Record<string, unknown> = {
      userId: session.userId,
      tags: { $exists: true, $ne: [] },
    }
    if (groupId) {
      matchFilter.$or = [{ groupId }, { groupId: { $exists: false } }, { groupId: null }]
    }

    // Get tags that are actually used in the user's logs
    const usedTags = await db
      .collection("logs")
      .aggregate([
        { $match: matchFilter },
        { $unwind: "$tags" },
        { $group: { _id: "$tags" } },
        { $sort: { _id: 1 } },
      ])
      .toArray()

    return NextResponse.json({
      tags: usedTags.map((t, i) => ({
        id: `tag-${i}`,
        name: t._id as string,
      })),
    })
  } catch (error) {
    console.error("Get tags error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
