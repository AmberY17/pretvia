import { NextResponse } from "next/server"
import { getSession, createSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import type { Db } from "mongodb"
import { ObjectId } from "mongodb"

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Helper: ensure user's groupIds array is in sync with their groupId
async function ensureGroupIds(db: Db, userId: string) {
  const user = await db.collection("users").findOne({
    _id: new ObjectId(userId),
  })
  if (!user) return user
  // Migrate: if user has groupId but no groupIds array, create it
  if (user.groupId && (!Array.isArray(user.groupIds) || !user.groupIds.includes(user.groupId))) {
    const groupIds = Array.isArray(user.groupIds) ? [...user.groupIds] : []
    if (!groupIds.includes(user.groupId)) groupIds.push(user.groupId)
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { groupIds } }
    )
    user.groupIds = groupIds
  }
  if (!Array.isArray(user.groupIds)) {
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { groupIds: [] } }
    )
    user.groupIds = []
  }
  return user
}

// POST: create a group (coach only), join a group, switch group, or leave a group
export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body
    const db = await getDb()

    if (action === "create") {
      // Verify user is a coach
      const user = await ensureGroupIds(db, session.userId)
      if (!user || user.role !== "coach") {
        return NextResponse.json(
          { error: "Only coaches can create groups" },
          { status: 403 }
        )
      }

      const { name } = body
      if (!name || name.trim().length < 2) {
        return NextResponse.json(
          { error: "Group name must be at least 2 characters" },
          { status: 400 }
        )
      }

      let code = generateCode()
      let existing = await db.collection("groups").findOne({ code })
      while (existing) {
        code = generateCode()
        existing = await db.collection("groups").findOne({ code })
      }

      const result = await db.collection("groups").insertOne({
        name: name.trim(),
        code,
        coachId: session.userId,
        coachIds: [session.userId],
        roles: [],
        createdAt: new Date(),
      })

      const groupId = result.insertedId.toString()

      // Add to groupIds and set as active
      await db.collection("users").updateOne(
        { _id: new ObjectId(session.userId) },
        {
          $set: { groupId },
          $addToSet: { groupIds: groupId },
        }
      )

      // Create group membership for role tracking (coach creating = first member)
      await db.collection("groupMemberships").insertOne({
        userId: session.userId,
        groupId,
        roleIds: [],
      })

      await createSession({
        ...session,
        groupId,
      })

      return NextResponse.json({
        success: true,
        group: { id: groupId, name: name.trim(), code },
      })
    }

    if (action === "join") {
      const { code } = body
      if (!code) {
        return NextResponse.json(
          { error: "Group code is required" },
          { status: 400 }
        )
      }

      const user = await ensureGroupIds(db, session.userId)
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const group = await db
        .collection("groups")
        .findOne({ code: code.toUpperCase() })

      if (!group) {
        return NextResponse.json(
          { error: "Invalid group code" },
          { status: 404 }
        )
      }

      const groupId = group._id.toString()

      // Check if already a member
      if (user.groupIds?.includes(groupId)) {
        // Already a member, just switch to it
        await db.collection("users").updateOne(
          { _id: new ObjectId(session.userId) },
          { $set: { groupId } }
        )
        // Ensure coach is in coachIds (e.g. migrated or re-joined)
        if (user.role === "coach") {
          await db.collection("groups").updateOne(
            { _id: group._id },
            { $addToSet: { coachIds: session.userId } }
          )
        }

        await createSession({
          ...session,
          groupId,
        })

        return NextResponse.json({
          success: true,
          group: {
            id: groupId,
            name: group.name,
            code: group.code,
          },
        })
      }

      // Add to groupIds and set as active
      await db.collection("users").updateOne(
        { _id: new ObjectId(session.userId) },
        {
          $set: { groupId },
          $addToSet: { groupIds: groupId },
        }
      )

      // Create group membership for role tracking
      await db.collection("groupMemberships").updateOne(
        { userId: session.userId, groupId },
        { $setOnInsert: { userId: session.userId, groupId, roleIds: [] } },
        { upsert: true }
      )

      // If coach joined, add to group's coachIds for equal management access
      if (user.role === "coach") {
        await db.collection("groups").updateOne(
          { _id: group._id },
          { $addToSet: { coachIds: session.userId } }
        )
      }

      await createSession({
        ...session,
        groupId,
      })

      return NextResponse.json({
        success: true,
        group: {
          id: groupId,
          name: group.name,
          code: group.code,
        },
      })
    }

    if (action === "switch") {
      const { groupId } = body
      if (!groupId) {
        return NextResponse.json(
          { error: "Group ID is required" },
          { status: 400 }
        )
      }

      const user = await ensureGroupIds(db, session.userId)
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Verify the user is a member of this group
      if (!user.groupIds?.includes(groupId)) {
        return NextResponse.json(
          { error: "You are not a member of this group" },
          { status: 403 }
        )
      }

      const group = await db.collection("groups").findOne({
        _id: new ObjectId(groupId),
      })

      if (!group) {
        return NextResponse.json(
          { error: "Group not found" },
          { status: 404 }
        )
      }

      await db.collection("users").updateOne(
        { _id: new ObjectId(session.userId) },
        { $set: { groupId } }
      )

      await createSession({
        ...session,
        groupId,
      })

      return NextResponse.json({
        success: true,
        group: {
          id: groupId,
          name: group.name,
          code: group.code,
        },
      })
    }

    if (action === "leave") {
      const user = await ensureGroupIds(db, session.userId)
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const currentGroupId = user.groupId

      if (!currentGroupId) {
        return NextResponse.json(
          { error: "Not in a group" },
          { status: 400 }
        )
      }

      // Remove from groupIds and clear active groupId
      const updatedGroupIds = (user.groupIds || []).filter(
        (id: string) => id !== currentGroupId
      )

      // If coach leaving, remove from group's coachIds
      if (user.role === "coach") {
        await db.collection("groups").updateOne(
          { _id: new ObjectId(currentGroupId) },
          { $pull: { coachIds: session.userId } }
        )
      }

      // Remove from groupMemberships
      await db.collection("groupMemberships").deleteOne({
        userId: session.userId,
        groupId: currentGroupId,
      })

      // Switch to another group if available, otherwise null
      const newActiveGroupId = updatedGroupIds.length > 0 ? updatedGroupIds[0] : null

      await db.collection("users").updateOne(
        { _id: new ObjectId(session.userId) },
        {
          $set: {
            groupId: newActiveGroupId,
            groupIds: updatedGroupIds,
          },
        }
      )

      await createSession({
        ...session,
        groupId: newActiveGroupId || undefined,
      })

      return NextResponse.json({ success: true, newActiveGroupId })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Groups error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// GET: fetch group members, coach's groups, or user's groups
export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get("groupId")
    const mode = searchParams.get("mode")

    const db = await getDb()

    // Mode: fetch all groups this coach can manage (creator or in coachIds)
    if (mode === "coach-groups") {
      const groups = await db
        .collection("groups")
        .find({
          $or: [
            { coachId: session.userId },
            { coachIds: session.userId },
          ],
        })
        .sort({ createdAt: -1 })
        .toArray()

      return NextResponse.json({
        groups: groups.map((g) => ({
          id: g._id.toString(),
          name: g.name,
          code: g.code,
        })),
      })
    }

    // Mode: fetch all groups the user is a member of
    if (mode === "my-groups") {
      const user = await db.collection("users").findOne({
        _id: new ObjectId(session.userId),
      })

      if (!user) {
        return NextResponse.json({ groups: [] })
      }

      const groupIds = Array.isArray(user.groupIds) ? user.groupIds : []
      // Also include current groupId for backward compat
      if (user.groupId && !groupIds.includes(user.groupId)) {
        groupIds.push(user.groupId)
      }

      if (groupIds.length === 0) {
        return NextResponse.json({ groups: [] })
      }

      const groups = await db
        .collection("groups")
        .find({ _id: { $in: groupIds.map((id: string) => new ObjectId(id)) } })
        .toArray()

      return NextResponse.json({
        groups: groups.map((g) => ({
          id: g._id.toString(),
          name: g.name,
          code: g.code,
          coachId: g.coachId,
        })),
      })
    }

    // Default: fetch members for a specific group (with roles and roleIds)
    if (!groupId) {
      return NextResponse.json({ members: [], roles: [] })
    }

    const group = await db.collection("groups").findOne({
      _id: new ObjectId(groupId),
    })
    const roles = group?.roles ?? []

    const members = await db
      .collection("users")
      .find({ $or: [{ groupIds: groupId }, { groupId: groupId }] })
      .project({ password: 0 })
      .toArray()

    const membershipDocs = await db
      .collection("groupMemberships")
      .find({ groupId, userId: { $in: members.map((m) => m._id.toString()) } })
      .toArray()
    const roleIdsByUser = new Map(
      membershipDocs.map((m: { userId: string; roleIds: string[] }) => [
        m.userId,
        m.roleIds ?? [],
      ])
    )

    return NextResponse.json({
      members: members.map((m) => ({
        id: m._id.toString(),
        displayName: m.displayName,
        email: m.email,
        role: m.role || "athlete",
        roleIds: roleIdsByUser.get(m._id.toString()) ?? [],
      })),
      roles,
    })
  } catch (error) {
    console.error("Get group members error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
