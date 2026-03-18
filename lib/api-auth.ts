import type { Db } from "mongodb"
import { ObjectId } from "mongodb"

export async function canManageGroup(db: Db, userId: string, groupId: string) {
  const user = await db.collection("users").findOne({
    _id: new ObjectId(userId),
  })
  if (!user || user.role !== "coach") return false

  const group = await db.collection("groups").findOne({
    _id: new ObjectId(groupId),
  })
  if (!group) return false

  if (group.coachId?.toString() === userId) return true
  if (Array.isArray(group.coachIds) && group.coachIds.some((id: unknown) => id?.toString() === userId)) return true

  if (user.groupId?.toString() === groupId) return true
  if (Array.isArray(user.groupIds) && user.groupIds.some((id: unknown) => id?.toString() === groupId)) return true

  return false
}
