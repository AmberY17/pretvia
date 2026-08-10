import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { canManageGroup } from "@/lib/api-auth"
import { safeObjectId } from "@/lib/objectid"

// PATCH: update member (assign roles, remove from group, transfer)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { groupId } = await params
    const db = await getDb()

    if (!(await canManageGroup(db, session.userId, groupId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { action, userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }

    const userOid = safeObjectId(userId)
    if (!userOid) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const targetUser = await db.collection("users").findOne({
      _id: userOid,
    })
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const isMember =
      targetUser.groupIds?.includes(groupId) || targetUser.activeGroupId === groupId
    if (!isMember) {
      return NextResponse.json(
        { error: "User is not a member of this group" },
        { status: 400 }
      )
    }

    // `canManageGroup` passes for any coach of the group, so without this an
    // assistant coach could evict or transfer the head coach — bypassing the
    // head-coach-only gate that DELETE /coaches/[coachId] enforces.
    if (action === "remove" || action === "transfer") {
      const groupOid = safeObjectId(groupId)
      if (!groupOid) {
        return NextResponse.json({ error: "Invalid group ID" }, { status: 400 })
      }
      const group = await db.collection("groups").findOne(
        { _id: groupOid },
        { projection: { headCoachId: 1 } }
      )
      if (group?.headCoachId?.toString() === userId) {
        return NextResponse.json(
          { error: "The head coach cannot be removed from their own group" },
          { status: 403 }
        )
      }
      if (targetUser.role === "coach") {
        return NextResponse.json(
          { error: "Remove coaches from the group's coach list instead" },
          { status: 403 }
        )
      }
    }

    if (action === "remove") {
      const updatedGroupIds = (targetUser.groupIds ?? []).filter(
        (id: string) => id !== groupId
      )
      const newGroupId =
        targetUser.activeGroupId === groupId
          ? updatedGroupIds[0] ?? null
          : targetUser.activeGroupId

      await db.collection("users").updateOne(
        { _id: userOid },
        { $set: { groupIds: updatedGroupIds, activeGroupId: newGroupId } }
      )
      await db.collection("groupMemberships").deleteOne({ userId, groupId })
      return NextResponse.json({ success: true })
    }

    if (action === "transfer") {
      const { targetGroupId } = body
      if (!targetGroupId) {
        return NextResponse.json(
          { error: "targetGroupId is required for transfer" },
          { status: 400 }
        )
      }
      const targetGroupOid = safeObjectId(targetGroupId)
      if (!targetGroupOid) {
        return NextResponse.json({ error: "Invalid target group ID" }, { status: 400 })
      }
      const targetGroup = await db.collection("groups").findOne({
        _id: targetGroupOid,
      })
      if (!targetGroup) {
        return NextResponse.json({ error: "Target group not found" }, { status: 404 })
      }
      const coachIds = targetGroup.coachIds ?? (targetGroup.headCoachId ? [targetGroup.headCoachId] : [])
      if (!coachIds.includes(session.userId)) {
        return NextResponse.json(
          { error: "You can only transfer to groups you manage" },
          { status: 403 }
        )
      }
      if (targetUser.groupIds?.includes(targetGroupId)) {
        return NextResponse.json(
          { error: "User is already in that group" },
          { status: 400 }
        )
      }

      const updatedGroupIds = [
        ...(targetUser.groupIds ?? []).filter((id: string) => id !== groupId),
        targetGroupId,
      ]
      const newGroupId =
        targetUser.activeGroupId === groupId ? targetGroupId : targetUser.activeGroupId

      await db.collection("users").updateOne(
        { _id: userOid },
        { $set: { groupIds: updatedGroupIds, activeGroupId: newGroupId } }
      )
      await db.collection("groupMemberships").deleteOne({ userId, groupId })
      await db.collection("groupMemberships").updateOne(
        { userId, groupId: targetGroupId },
        { $setOnInsert: { userId, groupId: targetGroupId, roleIds: [] } },
        { upsert: true }
      )
      return NextResponse.json({ success: true })
    }

    if (action === "assignRoles") {
      const { roleIds } = body
      if (!Array.isArray(roleIds)) {
        return NextResponse.json(
          { error: "roleIds array is required" },
          { status: 400 }
        )
      }
      const group = await db.collection("groups").findOne({
        _id: new ObjectId(groupId),
      })
      const validRoleIds = (group?.roles ?? [])
        .map((r: { id: string }) => r.id)
        .filter((id: string) => roleIds.includes(id))

      await db.collection("groupMemberships").updateOne(
        { userId, groupId },
        { $set: { roleIds: validRoleIds } },
        { upsert: true }
      )
      return NextResponse.json({ success: true, roleIds: validRoleIds })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Update member error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
