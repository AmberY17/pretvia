import type { Db, ObjectId as ObjectIdType } from "mongodb"
import { ObjectId } from "mongodb"
import { createSession, type SessionPayload } from "@/lib/auth"
import { applyGroupTrainingScheduleToUser } from "@/lib/group-training-schedule"
import type { TrainingSlot } from "@/types/dashboard"

/**
 * Generate a unique 6-character alphanumeric group code.
 * Excludes ambiguous characters (0, O, 1, I).
 */
function generateGroupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * Ensure user's groupIds array is in sync with their activeGroupId.
 */
export async function ensureGroupIds(db: Db, userId: string) {
  const user = await db.collection("users").findOne({
    _id: new ObjectId(userId),
  })
  if (!user) return user

  if (user.activeGroupId && (!Array.isArray(user.groupIds) || !user.groupIds.includes(user.activeGroupId))) {
    const groupIds = Array.isArray(user.groupIds) ? [...user.groupIds] : []
    if (!groupIds.includes(user.activeGroupId)) groupIds.push(user.activeGroupId)
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { groupIds } },
    )
    user.groupIds = groupIds
  }
  if (!Array.isArray(user.groupIds)) {
    await db
      .collection("users")
      .updateOne({ _id: new ObjectId(userId) }, { $set: { groupIds: [] } })
    user.groupIds = []
  }
  return user
}

/** Mongo's duplicate-key error. */
const DUPLICATE_KEY = 11000

function isDuplicateCodeError(err: unknown): boolean {
  const e = err as { code?: number; keyPattern?: Record<string, unknown> }
  return e?.code === DUPLICATE_KEY && e?.keyPattern?.code !== undefined
}

/**
 * Insert a group, assigning it a unique code.
 *
 * The code is generated and the insert attempted directly: the unique index on
 * `groups.code` is the thing that guarantees uniqueness, and a collision is
 * retried. The previous approach — query for a free code, then insert — could
 * hand the same code to two concurrent requests, which made join-by-code
 * ambiguous.
 *
 * Returns the inserted id and the code that was actually used.
 */
export async function insertGroupWithUniqueCode(
  db: Db,
  group: Record<string, unknown>,
  maxAttempts = 5,
): Promise<{ groupId: string; code: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateGroupCode()
    try {
      const result = await db.collection("groups").insertOne({ ...group, code })
      return { groupId: result.insertedId.toString(), code }
    } catch (err) {
      if (!isDuplicateCodeError(err)) throw err
      // Collision on the code index — generate another and try again.
    }
  }
  // 32^6 codes; five collisions in a row means something is wrong, not unlucky.
  throw new Error("Could not allocate a unique group code")
}

/**
 * Add a user to a group: update groupIds, create membership, apply training schedule.
 */
export async function addUserToGroup(
  db: Db,
  session: SessionPayload,
  groupId: string,
  group: { _id: ObjectIdType; trainingScheduleTemplate?: TrainingSlot[] },
  userRole: string,
) {
  await db.collection("users").updateOne(
    { _id: new ObjectId(session.userId) },
    {
      $set: { activeGroupId: groupId },
      $addToSet: { groupIds: groupId },
    },
  )

  if (Array.isArray(group.trainingScheduleTemplate) && group.trainingScheduleTemplate.length > 0) {
    await applyGroupTrainingScheduleToUser(
      db,
      session.userId,
      groupId,
      group.trainingScheduleTemplate,
    )
  }

  await db.collection("groupMemberships").updateOne(
    { userId: session.userId, groupId },
    { $setOnInsert: { userId: session.userId, groupId, roleIds: [] } },
    { upsert: true },
  )

  if (userRole === "coach") {
    await db.collection("groups").updateOne(
      { _id: group._id },
      { $addToSet: { coachIds: session.userId } },
    )
  }

  await createSession({ ...session, activeGroupId: groupId })
}
