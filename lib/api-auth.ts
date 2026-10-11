import type { Db, Document } from "mongodb"
import { ObjectId } from "mongodb"

/** True if userId is the group's head coach or in coachIds. Ids are stored as string or ObjectId. */
export function isGroupCoach(group: Document, userId: string) {
  return (
    group.headCoachId?.toString() === userId ||
    (Array.isArray(group.coachIds) && group.coachIds.some((id: unknown) => id?.toString() === userId))
  )
}

export async function canManageGroup(db: Db, userId: string, groupId: string) {
  const user = await db.collection("users").findOne({
    _id: new ObjectId(userId),
  })
  if (!user || user.role !== "coach") return false

  const group = await db.collection("groups").findOne({
    _id: new ObjectId(groupId),
  })
  if (!group) return false

  if (isGroupCoach(group, userId)) return true

  if (user.activeGroupId?.toString() === groupId) return true
  if (Array.isArray(user.groupIds) && user.groupIds.some((id: unknown) => id?.toString() === groupId)) return true

  return false
}
