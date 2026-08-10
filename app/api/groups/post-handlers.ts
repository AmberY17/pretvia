import { NextResponse } from "next/server"
import { createSession } from "@/lib/auth"
import { ObjectId } from "mongodb"
import type { Db } from "mongodb"
import type { SessionPayload } from "@/lib/auth"
import {
  ensureGroupIds,
  insertGroupWithUniqueCode,
  addUserToGroup,
} from "@/lib/group-actions"
import { getUserSubscription, getEffectiveLimits } from "@/lib/subscription"

export async function handleCreate(
  db: Db,
  session: SessionPayload,
  body: { name?: string },
): Promise<NextResponse> {
  const user = await ensureGroupIds(db, session.userId)
  if (!user || user.role !== "coach") {
    return NextResponse.json(
      { error: "Only coaches can create groups" },
      { status: 403 },
    )
  }

  const sub = await getUserSubscription(db, session.userId)
  if (sub.isAssistant) {
    return NextResponse.json(
      { error: "Assistant coaches cannot create groups" },
      { status: 403 },
    )
  }

  const limits = getEffectiveLimits(sub)
  if (limits.groups !== Infinity) {
    const groupCount = await db
      .collection("groups")
      .countDocuments({ headCoachId: session.userId })
    if (groupCount >= limits.groups) {
      return NextResponse.json(
        { error: "Group limit reached", plan: sub.plan, limit: limits.groups },
        { status: 403 },
      )
    }
  }

  const { name } = body
  if (!name || name.trim().length < 2) {
    return NextResponse.json(
      { error: "Group name must be at least 2 characters" },
      { status: 400 },
    )
  }

  const { groupId, code } = await insertGroupWithUniqueCode(db, {
    name: name.trim(),
    headCoachId: session.userId,
    coachIds: [session.userId],
    roles: [],
    createdAt: new Date(),
  })

  await db.collection("users").updateOne(
    { _id: new ObjectId(session.userId) },
    { $set: { activeGroupId: groupId }, $addToSet: { groupIds: groupId } },
  )

  await db.collection("groupMemberships").insertOne({
    userId: session.userId,
    groupId,
    roleIds: [],
  })

  await createSession({ ...session, activeGroupId: groupId })

  return NextResponse.json({
    success: true,
    group: { id: groupId, name: name.trim(), code },
  })
}

export async function handleJoin(
  db: Db,
  session: SessionPayload,
  body: { code?: string },
): Promise<NextResponse> {
  const { code } = body
  if (!code) {
    return NextResponse.json(
      { error: "Group code is required" },
      { status: 400 },
    )
  }

  const user = await ensureGroupIds(db, session.userId)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (user.role === "athlete") {
    return NextResponse.json(
      { error: "Athletes must join via an invite link from their coach" },
      { status: 403 },
    )
  }

  const group = await db
    .collection("groups")
    .findOne({ code: code.toUpperCase() })

  if (!group) {
    return NextResponse.json({ error: "Invalid group code" }, { status: 404 })
  }

  const groupId = group._id.toString()

  // Already a member — just switch
  if (user.groupIds?.includes(groupId)) {
    await db.collection("users").updateOne(
      { _id: new ObjectId(session.userId) },
      { $set: { activeGroupId: groupId } },
    )
    if (user.role === "coach") {
      await db.collection("groups").updateOne(
        { _id: group._id },
        { $addToSet: { coachIds: session.userId } },
      )
    }
    await createSession({ ...session, activeGroupId: groupId })
    return NextResponse.json({
      success: true,
      group: { id: groupId, name: group.name, code: group.code },
    })
  }

  await addUserToGroup(db, session, groupId, group, user.role)

  return NextResponse.json({
    success: true,
    group: { id: groupId, name: group.name, code: group.code },
  })
}

export async function handleSwitch(
  db: Db,
  session: SessionPayload,
  body: { groupId?: string },
): Promise<NextResponse> {
  const { groupId } = body
  if (!groupId) {
    return NextResponse.json(
      { error: "Group ID is required" },
      { status: 400 },
    )
  }

  const user = await ensureGroupIds(db, session.userId)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (!user.groupIds?.includes(groupId)) {
    return NextResponse.json(
      { error: "You are not a member of this group" },
      { status: 403 },
    )
  }

  const group = await db
    .collection("groups")
    .findOne({ _id: new ObjectId(groupId) })

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(session.userId) },
    { $set: { activeGroupId: groupId } },
  )
  await createSession({ ...session, activeGroupId: groupId })

  return NextResponse.json({
    success: true,
    group: { id: groupId, name: group.name, code: group.code },
  })
}

export async function handleLeave(
  db: Db,
  session: SessionPayload,
): Promise<NextResponse> {
  const user = await ensureGroupIds(db, session.userId)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const currentGroupId = user.activeGroupId
  if (!currentGroupId) {
    return NextResponse.json({ error: "Not in a group" }, { status: 400 })
  }

  // A head coach who leaves loses membership but still owns the group: they keep
  // passing canManageGroup and the group still counts against their plan limit,
  // while no member can administer it. Require an ownership transfer first.
  const currentGroup = await db.collection("groups").findOne(
    { _id: new ObjectId(currentGroupId) },
    { projection: { headCoachId: 1 } },
  )
  if (currentGroup?.headCoachId?.toString() === session.userId) {
    return NextResponse.json(
      {
        error:
          "Transfer ownership to another coach before leaving a group you run, or delete the group.",
      },
      { status: 400 },
    )
  }

  const updatedGroupIds = (user.groupIds || []).filter(
    (id: string) => id !== currentGroupId,
  )

  if (user.role === "coach") {
    await db.collection("groups").updateOne(
      { _id: new ObjectId(currentGroupId) },
      // @ts-expect-error -- MongoDB $pull typing doesn't infer array element type
      { $pull: { coachIds: session.userId } },
    )
  }

  await db.collection("groupMemberships").deleteOne({
    userId: session.userId,
    groupId: currentGroupId,
  })

  const newActiveGroupId =
    updatedGroupIds.length > 0 ? updatedGroupIds[0] : null

  await db.collection("users").updateOne(
    { _id: new ObjectId(session.userId) },
    { $set: { activeGroupId: newActiveGroupId, groupIds: updatedGroupIds } },
  )

  await createSession({
    ...session,
    activeGroupId: newActiveGroupId || undefined,
  })

  return NextResponse.json({ success: true, newActiveGroupId })
}
