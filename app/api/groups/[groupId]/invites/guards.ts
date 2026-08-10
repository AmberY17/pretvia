import type { Db } from "mongodb"

/**
 * Guards shared by the single-invite and bulk-invite routes.
 *
 * The bulk route previously had neither check, so importing a roster twice
 * re-invited and re-emailed everyone, including people who had already joined.
 * Keeping the rules here means the two routes cannot drift apart.
 */

/**
 * Is this email already a member of the group?
 *
 * Reads the legacy singular `users.groupId` as well as `groupIds` — some
 * accounts still carry only the former until migration M1 lands.
 */
export async function isAlreadyGroupMember(
  db: Db,
  groupId: string,
  email: string,
): Promise<boolean> {
  const user = await db
    .collection("users")
    .findOne({ email }, { projection: { groupIds: 1, groupId: 1 } })
  if (!user) return false

  const memberGroupIds: string[] = Array.isArray(user.groupIds) ? [...user.groupIds] : []
  if (user.groupId && !memberGroupIds.includes(user.groupId as string)) {
    memberGroupIds.push(user.groupId as string)
  }
  return memberGroupIds.includes(groupId)
}

/** Is there an unexpired invite of this type already outstanding for the email? */
export async function hasActiveInvite(
  db: Db,
  groupId: string,
  email: string,
  type: string,
): Promise<boolean> {
  const existing = await db.collection("invites").findOne({
    groupId,
    email,
    type,
    expiresAt: { $gt: new Date() },
  })
  return existing !== null
}

/** Error copy, kept identical across both routes. */
export const ALREADY_MEMBER_ERROR = "This athlete is already a member of this group"
export const ACTIVE_INVITE_ERROR = "An active invite already exists for this email"
