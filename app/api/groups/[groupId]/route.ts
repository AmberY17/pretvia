import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { safeObjectId } from "@/lib/objectid"

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
    const groupOid = safeObjectId(groupId)
    if (!groupOid) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const body = await req.json()
    const { name } = body
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Group name must be at least 2 characters" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const group = await db.collection("groups").findOne({ _id: groupOid })
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    if (group.headCoachId?.toString() !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const trimmedName = name.trim()
    await db
      .collection("groups")
      .updateOne({ _id: groupOid }, { $set: { name: trimmedName } })

    return NextResponse.json({ group: { id: groupId, name: trimmedName, code: group.code } })
  } catch (err) {
    console.error("PATCH /api/groups/[groupId]:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
