import type { Db } from "mongodb"
import { safeObjectId } from "@/lib/objectid"

export async function canManageGroup(db: Db, userId: string, groupId: string) {
  // Ids arrive from route params and request bodies. Constructing an ObjectId
  // from a malformed one throws, which surfaced as a generic 500 rather than the
  // 403 (or the route's 400) the caller should see.
  const userOid = safeObjectId(userId)
  const groupOid = safeObjectId(groupId)
  if (!userOid || !groupOid) return false

  const user = await db.collection("users").findOne({ _id: userOid })
  if (!user || user.role !== "coach") return false

  const group = await db.collection("groups").findOne({ _id: groupOid })
  if (!group) return false

  if (group.headCoachId?.toString() === userId) return true
  if (Array.isArray(group.coachIds) && group.coachIds.some((id: unknown) => id?.toString() === userId)) return true

  if (user.activeGroupId?.toString() === groupId) return true
  if (Array.isArray(user.groupIds) && user.groupIds.some((id: unknown) => id?.toString() === groupId)) return true

  return false
}
