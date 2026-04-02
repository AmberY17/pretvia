import type { Db, ObjectId as ObjectIdType } from "mongodb"
import { ObjectId } from "mongodb"
import { createSession, type SessionPayload } from "@/lib/auth"
import { applyGroupTrainingScheduleToUser } from "@/lib/group-training-schedule"

/**
 * Generate a unique 6-character alphanumeric group code.
 * Excludes ambiguous characters (0, O, 1, I).
 */
export function generateGroupCode(): string {
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

/**
 * Generate a unique group code that doesn't exist in the database.
 */
export async function generateUniqueGroupCode(db: Db): Promise<string> {
  let code = generateGroupCode()
  let existing = await db.collection("groups").findOne({ code })
  while (existing) {
    code = generateGroupCode()
    existing = await db.collection("groups").findOne({ code })
  }
  return code
}

/**
 * Update the user's active group and refresh their session.
 */
export async function switchActiveGroup(
  db: Db,
  session: SessionPayload,
  groupId: string | null,
) {
  await db.collection("users").updateOne(
    { _id: new ObjectId(session.userId) },
    { $set: { activeGroupId: groupId } },
  )
  await createSession({ ...session, activeGroupId: groupId || undefined })
}

/**
 * Add a user to a group: update groupIds, create membership, apply training schedule.
 */
export async function addUserToGroup(
  db: Db,
  session: SessionPayload,
  groupId: string,
  group: { _id: ObjectIdType; trainingScheduleTemplate?: { dayOfWeek: number; time: string }[] },
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
