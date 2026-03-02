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

  const coachIds = group.coachIds ?? (group.coachId ? [group.coachId] : [])
  if (coachIds.includes(userId)) return true

  const groupIds = user.groupIds ?? (user.groupId ? [user.groupId] : [])
  return groupIds.includes(groupId)
}
