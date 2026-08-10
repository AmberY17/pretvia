import type { Db, ObjectId as ObjectIdType } from "mongodb"
import { ObjectId } from "mongodb"
import { createSession, type SessionPayload } from "@/lib/auth"
import { applyGroupTrainingScheduleToUser } from "@/lib/group-training-schedule"
import { safeObjectId } from "@/lib/objectid"
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
 * Membership lives in three places that must move together:
 *
 *   - `users.groupIds`        — member lists and log visibility (`lib/log-filters.ts`)
 *   - `groupMemberships`      — per-group roles
 *   - `groups.coachIds`       — who may coach the group (`canManageGroup`)
 *
 * Every add/remove goes through one of the helpers below. Writing only some of
 * them is what produced the drift these fix: a coach added without a
 * `groupMemberships` row had no roles, and a coach removed without pulling
 * `coachIds` kept passing `canManageGroup` for a group they had left.
 *
 * `addUserToGroup` covers the *self-service* case (the session holder joining,
 * which also re-issues their session); these two cover a coach acting on
 * someone else.
 */

/** Ids are stored as strings in some places and ObjectIds in others. */
function idForms(id: string): unknown[] {
  const oid = safeObjectId(id)
  return oid ? [id, oid] : [id]
}

/**
 * Add an existing user to a group as a coach, writing all three stores.
 */
export async function addCoachToGroup(
  db: Db,
  coachId: string,
  groupId: string,
  groupOid: ObjectIdType,
): Promise<void> {
  await db
    .collection("groups")
    .updateOne({ _id: groupOid }, { $addToSet: { coachIds: coachId } } as never)

  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(coachId) }, { $addToSet: { groupIds: groupId } } as never)

  await db.collection("groupMemberships").updateOne(
    { userId: coachId, groupId },
    { $setOnInsert: { userId: coachId, groupId, roleIds: [] } },
    { upsert: true },
  )
}

/**
 * Remove a user from a group, writing all three stores.
 *
 * `coachIds` is pulled unconditionally — it is a no-op for an athlete, and doing
 * it always means no caller has to remember whether the target is a coach.
 * If the group being left was the user's active one, the active group moves to
 * another of their groups (or null, which the join/create flow handles).
 */
export async function removeUserFromGroup(
  db: Db,
  userId: string,
  groupId: string,
  groupOid: ObjectIdType,
): Promise<void> {
  const userOid = new ObjectId(userId)

  await db
    .collection("groups")
    .updateOne({ _id: groupOid }, { $pull: { coachIds: { $in: idForms(userId) } } } as never)

  await db.collection("groupMemberships").deleteOne({ userId, groupId })

  const user = await db
    .collection("users")
    .findOne({ _id: userOid }, { projection: { groupIds: 1, activeGroupId: 1 } })

  const remaining = (Array.isArray(user?.groupIds) ? user.groupIds : []).filter(
    (id: string) => id !== groupId,
  )

  const update: Record<string, unknown> = { $set: { groupIds: remaining } }
  if (user?.activeGroupId === groupId) {
    ;(update.$set as Record<string, unknown>).activeGroupId = remaining[0] ?? null
  }

  await db.collection("users").updateOne({ _id: userOid }, update)
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
