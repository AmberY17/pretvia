import { NextResponse } from "next/server"
import { getSession, deleteSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import clientPromise from "@/lib/mongodb"
import { ObjectId, type Db, type ClientSession } from "mongodb"

/**
 * Delete a user account and everything that hangs off it.
 *
 * Two rules that are easy to get wrong and were previously wrong:
 *
 *  - **Only groups the user *owns* are deleted.** A coach can appear in another
 *    coach's `groups.coachIds` as an assistant; deleting their account must remove
 *    them from that group, not destroy the group and every athlete's checkins,
 *    attendance and announcements along with it.
 *  - **Member users must be cleaned up.** Deleting a group leaves every member's
 *    `users.groupIds` / `activeGroupId` pointing at a group that no longer exists.
 */
async function cascadeDeleteAccount(db: Db, userId: string, session?: ClientSession) {
  const opts = session ? { session } : {}

  const userDoc = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) }, opts)
  if (!userDoc) return { notFound: true as const }

  const emailNorm =
    typeof userDoc.email === "string" ? userDoc.email.trim().toLowerCase() : ""

  // 1. Delete this user's own group memberships
  await db.collection("groupMemberships").deleteMany({ userId }, opts)

  // `headCoachId` / `coachIds` are stored inconsistently as strings or ObjectIds
  // (see CLAUDE.md, "Dual/Overlapping Fields"), so match both forms — otherwise an
  // ObjectId-keyed group would survive its owner's deletion as an orphan.
  const userIdForms: unknown[] = [userId, new ObjectId(userId)]

  // 2. Groups this user OWNS are cascaded; groups they merely coach are not.
  const ownedGroups = await db
    .collection("groups")
    .find({ headCoachId: { $in: userIdForms } }, opts)
    .toArray()
  const ownedGroupIds = ownedGroups.map((g) => g._id.toString())

  for (const group of ownedGroups) {
    const groupId = group._id.toString()
    await db.collection("invites").deleteMany({ groupId }, opts)
    await db.collection("groupMemberships").deleteMany({ groupId }, opts)
    await db.collection("checkins").deleteMany({ groupId }, opts)
    await db.collection("attendance").deleteMany({ groupId }, opts)
    await db.collection("announcements").deleteMany({ groupId }, opts)
    await db.collection("groups").deleteOne({ _id: group._id }, opts)
  }

  // 2b. Step down as an assistant coach elsewhere — keep those groups intact.
  await db
    .collection("groups")
    .updateMany(
      { coachIds: { $in: userIdForms } },
      { $pull: { coachIds: { $in: userIdForms } } } as never,
      opts,
    )

  // 2c. Members of the deleted groups must not keep dangling references.
  if (ownedGroupIds.length > 0) {
    await db
      .collection("users")
      .updateMany(
        { groupIds: { $in: ownedGroupIds } },
        { $pull: { groupIds: { $in: ownedGroupIds } } } as never,
        opts,
      )
    // Members left without an active group land on the join/create flow, which
    // already handles a user who belongs to no group.
    await db
      .collection("users")
      .updateMany(
        { activeGroupId: { $in: ownedGroupIds } },
        { $unset: { activeGroupId: "" } },
        opts,
      )
  }

  // 3. Remove this user from attendance roll entries in groups they didn't own
  await db
    .collection("attendance")
    .updateMany({ "entries.userId": userId }, { $pull: { entries: { userId } } } as never, opts)

  // 4. Get user's log IDs before deleting logs (for cascading)
  const userLogs = await db
    .collection("logs")
    .find({ userId }, opts)
    .project({ _id: 1 })
    .toArray()
  const logIds = userLogs.map((l) => l._id.toString())

  // 5. Delete comments on user's logs and comments by user
  if (logIds.length > 0) {
    await db
      .collection("comments")
      .deleteMany({ $or: [{ logId: { $in: logIds } }, { authorId: userId }] }, opts)
  } else {
    await db.collection("comments").deleteMany({ authorId: userId }, opts)
  }

  // 6. Delete log_reviews. Reviews are written with `coachId`
  // (app/api/logs/[logId]/review/route.ts); `headCoachId` is the legacy field name
  // and may still be present on older documents, so both are matched.
  await db.collection("log_reviews").deleteMany(
    {
      $or: [
        { coachId: userId },
        { headCoachId: userId },
        ...(logIds.length > 0 ? [{ logId: { $in: logIds } }] : []),
      ],
    },
    opts,
  )

  // 7. Delete comment_reads: on this user's logs (all readers) and this user's reads elsewhere
  if (logIds.length > 0) {
    await db
      .collection("comment_reads")
      .deleteMany({ $or: [{ logId: { $in: logIds } }, { userId }] }, opts)
  } else {
    await db.collection("comment_reads").deleteMany({ userId }, opts)
  }

  // 8. Delete user's logs
  await db.collection("logs").deleteMany({ userId }, opts)

  // 9. Delete checkins created by this coach (in groups they don't own — e.g. if they left)
  await db.collection("checkins").deleteMany({ headCoachId: userId }, opts)

  // 10. Streak / schedule skips
  await db.collection("skippedDays").deleteMany({ userId }, opts)

  // 11. Guardian links and pending guardian-athlete rows
  await db
    .collection("guardianLinks")
    .deleteMany({ $or: [{ guardianId: userId }, { athleteId: userId }] }, opts)
  const guardianPendingOr: Record<string, unknown>[] = [{ guardianId: userId }]
  if (emailNorm) guardianPendingOr.push({ athleteEmail: emailNorm })
  await db.collection("guardianPendingAthletes").deleteMany({ $or: guardianPendingOr }, opts)

  // 12. Invites created by or addressed to this user (remaining after group deletions)
  const inviteOr: Record<string, unknown>[] = [{ createdBy: userId }]
  if (emailNorm) {
    inviteOr.push({ email: emailNorm }, { athleteEmail: emailNorm })
  }
  await db.collection("invites").deleteMany({ $or: inviteOr }, opts)

  // 13. Email-keyed pre-account / auth artifacts
  if (emailNorm) {
    await db.collection("pending_signups").deleteMany({ email: emailNorm }, opts)
    await db.collection("password_reset_tokens").deleteMany({ email: emailNorm }, opts)
    await db.collection("waitlist").deleteMany({ email: emailNorm }, opts)
    await db
      .collection("pending_under13_child")
      .deleteMany(
        { $or: [{ childEmail: emailNorm }, { parentEmail: emailNorm }] },
        opts,
      )
  }

  // 14. Delete user document
  await db.collection("users").deleteOne({ _id: new ObjectId(userId) }, opts)

  return { notFound: false as const }
}

/** MongoDB rejects transactions on a standalone server (no replica set). */
function isTransactionUnsupported(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return (
    message.includes("Transaction numbers are only allowed on a replica set") ||
    message.includes("Transactions are not supported") ||
    message.includes("IllegalOperation")
  )
}

export async function DELETE() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const userId = session.userId

    // The cascade is ~15 writes; a failure partway through would leave a
    // half-deleted account. Run it atomically where the deployment supports it.
    let result: { notFound: boolean }
    const client = await clientPromise
    const mongoSession = client.startSession()
    try {
      let inner: { notFound: boolean } | undefined
      await mongoSession.withTransaction(async () => {
        inner = await cascadeDeleteAccount(db, userId, mongoSession)
      })
      result = inner!
    } catch (err) {
      if (!isTransactionUnsupported(err)) throw err
      // Standalone mongod (local dev): fall back to sequential writes.
      console.warn("Account deletion: transactions unsupported, running unwrapped")
      result = await cascadeDeleteAccount(db, userId)
    } finally {
      await mongoSession.endSession()
    }

    if (result.notFound) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

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
