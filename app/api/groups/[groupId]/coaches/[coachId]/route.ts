import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { safeObjectId } from "@/lib/objectid"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string; coachId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId, coachId } = await params

    const groupOid = safeObjectId(groupId)
    const coachOid = safeObjectId(coachId)
    if (!groupOid || !coachOid) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const db = await getDb()
    const group = await db.collection("groups").findOne({ _id: groupOid })
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    if (group.headCoachId?.toString() !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (coachId === session.userId) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 })
    }

    await db
      .collection("groups")
      .updateOne({ _id: groupOid }, { $pull: { coachIds: coachId } as never })

    const coachUser = await db.collection("users").findOne({ _id: coachOid })
    if (coachUser) {
      const remainingGroupIds: string[] = (
        Array.isArray(coachUser.groupIds) ? coachUser.groupIds : []
      ).filter((id: string) => id !== groupId)

      const update: Record<string, unknown> = {
        $pull: { groupIds: groupId },
      }

      if (coachUser.activeGroupId === groupId) {
        update.$set = { activeGroupId: remainingGroupIds[0] ?? null }
      }

      await db.collection("users").updateOne({ _id: coachOid }, update as never)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/groups/[groupId]/coaches/[coachId]:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
