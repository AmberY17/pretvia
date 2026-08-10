import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import clientPromise from "@/lib/mongodb"
import { safeObjectId } from "@/lib/objectid"
import { addCoachToGroup, removeUserFromGroup } from "@/lib/group-actions"
import type { Db, ObjectId } from "mongodb"

/**
 * Both handlers are head-coach-only and share the same lookups, so resolve and
 * authorize once. Returns either an error response or the parsed ids.
 */
async function authorize(
  db: Db,
  sessionUserId: string,
  groupId: string,
  coachId: string,
): Promise<
  { error: NextResponse } | { error?: never; groupOid: ObjectId; coachOid: ObjectId }
> {
  const groupOid = safeObjectId(groupId)
  const coachOid = safeObjectId(coachId)
  if (!groupOid || !coachOid) {
    return { error: NextResponse.json({ error: "Invalid ID" }, { status: 400 }) }
  }

  const group = await db.collection("groups").findOne({ _id: groupOid })
  if (!group) {
    return { error: NextResponse.json({ error: "Group not found" }, { status: 404 }) }
  }

  if (group.headCoachId?.toString() !== sessionUserId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { groupOid, coachOid }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string; coachId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId, coachId } = await params
    const db = await getDb()

    const auth = await authorize(db, session.userId, groupId, coachId)
    if (auth.error) return auth.error

    if (coachId === session.userId) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 })
    }

    // Writes all three membership stores. Previously this pulled coachIds and
    // groupIds but left the groupMemberships document behind.
    await removeUserFromGroup(db, coachId, groupId, auth.groupOid)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/groups/[groupId]/coaches/[coachId]:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

/**
 * PATCH: move a coach from this group to another group in the same club.
 *
 * The UI previously did this as a DELETE followed by a POST. If the POST failed
 * — a network drop, or the target group rejecting the add — the coach was left
 * in neither group with nothing to undo the removal. Doing both writes here lets
 * them share a transaction.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ groupId: string; coachId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId, coachId } = await params
    const db = await getDb()

    const auth = await authorize(db, session.userId, groupId, coachId)
    if (auth.error) return auth.error

    if (coachId === session.userId) {
      return NextResponse.json({ error: "Cannot move yourself" }, { status: 400 })
    }

    const { targetGroupId } = await req.json()
    if (!targetGroupId || typeof targetGroupId !== "string") {
      return NextResponse.json({ error: "targetGroupId is required" }, { status: 400 })
    }
    if (targetGroupId === groupId) {
      return NextResponse.json(
        { error: "The coach is already in this group" },
        { status: 400 },
      )
    }

    const targetOid = safeObjectId(targetGroupId)
    if (!targetOid) {
      return NextResponse.json({ error: "Invalid target group ID" }, { status: 400 })
    }

    // The caller must head-coach the destination too, or this would be a way to
    // push a coach into someone else's group.
    const targetGroup = await db.collection("groups").findOne({ _id: targetOid })
    if (!targetGroup) {
      return NextResponse.json({ error: "Target group not found" }, { status: 404 })
    }
    if (targetGroup.headCoachId?.toString() !== session.userId) {
      return NextResponse.json(
        { error: "You can only move coaches to groups you run" },
        { status: 403 },
      )
    }

    const move = async () => {
      await removeUserFromGroup(db, coachId, groupId, auth.groupOid)
      await addCoachToGroup(db, coachId, targetGroupId, targetOid)
    }

    const client = await clientPromise
    const mongoSession = client.startSession()
    try {
      await mongoSession.withTransaction(move)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const unsupported =
        message.includes("Transaction numbers are only allowed on a replica set") ||
        message.includes("Transactions are not supported") ||
        message.includes("IllegalOperation")
      if (!unsupported) throw err
      // Standalone mongod (local dev) cannot start a transaction.
      console.warn("Coach move: transactions unsupported, running unwrapped")
      await move()
    } finally {
      await mongoSession.endSession()
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("PATCH /api/groups/[groupId]/coaches/[coachId]:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
