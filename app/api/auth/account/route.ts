import { NextResponse } from "next/server"
import { getSession, deleteSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function DELETE() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const userId = session.userId

    // 1. Delete user's group memberships
    await db.collection("groupMemberships").deleteMany({ userId })

    // 2. If coach: delete groups they own and all related data
    const ownedGroups = await db
      .collection("groups")
      .find({
        $or: [{ coachId: userId }, { coachIds: userId }],
      })
      .toArray()

    for (const group of ownedGroups) {
      const groupId = group._id.toString()
      await db.collection("groupMemberships").deleteMany({ groupId })
      await db.collection("checkins").deleteMany({ groupId })
      await db.collection("attendance").deleteMany({ groupId })
      await db.collection("announcements").deleteMany({ groupId })
      await db.collection("groups").deleteOne({ _id: group._id })
    }

    // 3. Get user's log IDs before deleting logs (for cascading)
    const userLogs = await db
      .collection("logs")
      .find({ userId })
      .project({ _id: 1 })
      .toArray()
    const logIds = userLogs.map((l) => l._id.toString())

    // 4. Delete comments on user's logs and comments by user
    if (logIds.length > 0) {
      await db.collection("comments").deleteMany({
        $or: [{ logId: { $in: logIds } }, { authorId: userId }],
      })
    } else {
      await db.collection("comments").deleteMany({ authorId: userId })
    }

    // 5. Delete log_reviews (reviews by this coach, or for this user's logs)
    await db.collection("log_reviews").deleteMany({
      $or: [{ coachId: userId }, ...(logIds.length > 0 ? [{ logId: { $in: logIds } }] : [])],
    })

    // 6. Delete comment_reads by this user
    await db.collection("comment_reads").deleteMany({ userId })

    // 7. Delete user's logs
    await db.collection("logs").deleteMany({ userId })

    // 8. Delete checkins created by this coach (for groups they don't own - e.g. if they left)
    await db.collection("checkins").deleteMany({ coachId: userId })

    // 9. Delete user document
    await db.collection("users").deleteOne({ _id: new ObjectId(userId) })

    await deleteSession()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Account deletion error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
