import type { Db } from "mongodb"
import { ObjectId } from "mongodb"
import { safeObjectId } from "@/lib/objectid"

/**
 * Build the base visibility filter for log queries.
 * Determines which logs a user can see based on their role and group membership.
 */
export async function buildVisibilityFilter(
  db: Db,
  params: {
    userId: string
    userRole: string | undefined
    userGroupId: string | null
    filterUserIds: string[]
    filterRoleIds: string[]
  },
): Promise<Record<string, unknown>> {
  const { userId, userRole, userGroupId, filterUserIds, filterRoleIds } = params

  if (!userGroupId) {
    return { userId }
  }

  // Get all members of the same group
  const groupMembers = await db
    .collection("users")
    .find({ groupIds: userGroupId })
    .project({ _id: 1 })
    .toArray()
  let memberIds = groupMembers.map((m) => m._id.toString())

  // Filter by roles: restrict to athletes with any of the selected roleIds
  if (filterRoleIds.length > 0 && userRole === "coach") {
    const withRole = await db
      .collection("groupMemberships")
      .find({ groupId: userGroupId, roleIds: { $in: filterRoleIds } })
      .project({ userId: 1 })
      .toArray()
    const roleMemberIds = (withRole as { userId: string }[]).map((m) => m.userId)
    memberIds = memberIds.filter((id) => roleMemberIds.includes(id))
  }

  const coachVisibilityCondition = {
    $or: [{ visibility: "coach" }, { visibility: { $exists: false }, isGroup: true }],
  }

  if (filterUserIds.length > 0 && userRole === "coach") {
    const validIds = filterUserIds.filter((id) => memberIds.includes(id))
    if (validIds.length === 0) return { _id: null } // no results
    return { userId: { $in: validIds }, ...coachVisibilityCondition }
  }

  if (userRole === "coach") {
    return {
      $or: [{ userId }, { userId: { $in: memberIds }, ...coachVisibilityCondition }],
    }
  }

  return { userId }
}

/**
 * Apply date filtering to an existing filter object.
 */
export function applyDateFilter(
  filter: Record<string, unknown>,
  dateFrom: string | null,
  dateTo: string | null,
  datesParam: string | null,
): Record<string, unknown> {
  if (datesParam) {
    const dateStrs = datesParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (dateStrs.length > 0) {
      const dayConditions = dateStrs
        .map((d) => {
          const [y, m, day] = d.split("-").map(Number)
          if (!y || !m || !day) return null
          const start = new Date(y, m - 1, day, 0, 0, 0, 0)
          const end = new Date(y, m - 1, day, 23, 59, 59, 999)
          return { timestamp: { $gte: start, $lte: end } }
        })
        .filter(Boolean) as Record<string, unknown>[]
      if (dayConditions.length > 0) {
        return { $and: [filter, { $or: dayConditions }] }
      }
    }
  } else if (dateFrom || dateTo) {
    const timestampFilter: Record<string, Date> = {}
    if (dateFrom) timestampFilter.$gte = new Date(dateFrom)
    if (dateTo) timestampFilter.$lte = new Date(dateTo)
    filter.timestamp = timestampFilter
  }
  return filter
}

/**
 * Apply cursor-based pagination to an existing filter.
 */
export function applyCursorFilter(
  filter: Record<string, unknown>,
  cursor: string | null,
): Record<string, unknown> {
  if (!cursor) return filter

  try {
    const sep = cursor.indexOf("|")
    const tsStr = sep >= 0 ? cursor.slice(0, sep) : ""
    const idStr = sep >= 0 ? cursor.slice(sep + 1) : ""
    const cursorTs = new Date(tsStr)
    const cursorId = safeObjectId(idStr)
    if (!Number.isNaN(cursorTs.getTime()) && cursorId) {
      const cursorCondition = {
        $or: [{ timestamp: { $lt: cursorTs } }, { timestamp: cursorTs, _id: { $lt: cursorId } }],
      }
      return { $and: [filter, cursorCondition] }
    }
  } catch {
    // Invalid cursor, ignore
  }
  return filter
}

/**
 * Build a map of logId → reviewStatus for coach review filtering.
 */
export async function buildReviewStatusMap(
  db: Db,
  logIds: string[],
  coachId: string,
): Promise<Map<string, string>> {
  const reviewMap = new Map<string, string>()
  const reviews = await db
    .collection("log_reviews")
    .find({ logId: { $in: logIds }, coachId })
    .toArray()
  for (const r of reviews) {
    reviewMap.set(r.logId, r.status)
  }
  return reviewMap
}

/**
 * Fetch display names for a set of user IDs.
 */
export async function fetchUserDisplayNames(
  db: Db,
  userIds: string[],
): Promise<Map<string, string>> {
  const users = await db
    .collection("users")
    .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
    .project({ displayName: 1 })
    .toArray()
  return new Map(users.map((u) => [u._id.toString(), u.displayName || "Unknown"]))
}
