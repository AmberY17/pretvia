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

    const userDoc = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    })
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const emailNorm =
      typeof userDoc.email === "string" ? userDoc.email.trim().toLowerCase() : ""

    // 1. Delete user's group memberships
    await db.collection("groupMemberships").deleteMany({ userId })

    // 2. If coach: delete groups they own / coach and all related data
    const ownedGroups = await db
      .collection("groups")
      .find({
        $or: [{ headCoachId: userId }, { coachIds: userId }],
      })
      .toArray()

    for (const group of ownedGroups) {
      const groupId = group._id.toString()
      await db.collection("invites").deleteMany({ groupId })
      await db.collection("groupMemberships").deleteMany({ groupId })
      await db.collection("checkins").deleteMany({ groupId })
      await db.collection("attendance").deleteMany({ groupId })
      await db.collection("announcements").deleteMany({ groupId })
      await db.collection("groups").deleteOne({ _id: group._id })
    }

    // 3. Remove this user from attendance roll entries (member of groups they did not delete as coach)
    await db.collection("attendance").updateMany(
      { "entries.userId": userId },
      { $pull: { entries: { userId } } } as never,
    )

    // 4. Get user's log IDs before deleting logs (for cascading)
    const userLogs = await db
      .collection("logs")
      .find({ userId })
      .project({ _id: 1 })
      .toArray()
    const logIds = userLogs.map((l) => l._id.toString())

    // 5. Delete comments on user's logs and comments by user
    if (logIds.length > 0) {
      await db.collection("comments").deleteMany({
        $or: [{ logId: { $in: logIds } }, { authorId: userId }],
      })
    } else {
      await db.collection("comments").deleteMany({ authorId: userId })
    }

    // 6. Delete log_reviews (reviews by this coach, or for this user's logs)
    await db.collection("log_reviews").deleteMany({
      $or: [{ headCoachId: userId }, ...(logIds.length > 0 ? [{ logId: { $in: logIds } }] : [])],
    })

    // 7. Delete comment_reads: on this user's logs (all readers) and this user's reads elsewhere
    if (logIds.length > 0) {
      await db.collection("comment_reads").deleteMany({
        $or: [{ logId: { $in: logIds } }, { userId }],
      })
    } else {
      await db.collection("comment_reads").deleteMany({ userId })
    }

    // 8. Delete user's logs
    await db.collection("logs").deleteMany({ userId })

    // 9. Delete checkins created by this coach (for groups they don't own — e.g. if they left)
    await db.collection("checkins").deleteMany({ headCoachId: userId })

    // 10. Streak / schedule skips
    await db.collection("skippedDays").deleteMany({ userId })

    // 11. Guardian links and pending guardian-athlete rows
    await db.collection("guardianLinks").deleteMany({
      $or: [{ guardianId: userId }, { athleteId: userId }],
    })
    const guardianPendingOr: Record<string, unknown>[] = [{ guardianId: userId }]
    if (emailNorm) guardianPendingOr.push({ athleteEmail: emailNorm })
    await db.collection("guardianPendingAthletes").deleteMany({ $or: guardianPendingOr })

    // 12. Invites created by or addressed to this user (remaining after group deletions)
    const inviteOr: Record<string, unknown>[] = [{ createdBy: userId }]
    if (emailNorm) {
      inviteOr.push({ email: emailNorm }, { athleteEmail: emailNorm })
    }
    await db.collection("invites").deleteMany({ $or: inviteOr })

    // 13. Email-keyed pre-account / auth artifacts
    if (emailNorm) {
      await db.collection("pending_signups").deleteMany({ email: emailNorm })
      await db.collection("password_reset_tokens").deleteMany({ email: emailNorm })
      await db.collection("waitlist").deleteMany({ email: emailNorm })
      await db.collection("pending_under13_child").deleteMany({
        $or: [{ childEmail: emailNorm }, { parentEmail: emailNorm }],
      })
    }

    // 14. Delete user document
    await db.collection("users").deleteOne({ _id: new ObjectId(userId) })

    await deleteSession()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Account deletion error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    )
  }
}
