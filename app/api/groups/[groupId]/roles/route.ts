import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import type { Db } from "mongodb"
import { ObjectId } from "mongodb"

async function canManageGroup(db: Db, userId: string, groupId: string) {
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

// GET: list roles for a group
export async function GET(
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

    const group = await db.collection("groups").findOne({
      _id: new ObjectId(groupId),
    })
    const roles = group?.roles ?? []

    return NextResponse.json({ roles })
  } catch (error) {
    console.error("Get roles error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// POST: create a role
export async function POST(
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

    const { name } = await req.json()
    if (!name || typeof name !== "string" || name.trim().length < 1) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      )
    }

    const group = await db.collection("groups").findOne({
      _id: new ObjectId(groupId),
    })
    const roles: { id: string; name: string }[] = group?.roles ?? []
    const id = crypto.randomUUID()
    const newRole = { id, name: name.trim() }
    roles.push(newRole)

    await db.collection("groups").updateOne(
      { _id: new ObjectId(groupId) },
      { $set: { roles } }
    )

    return NextResponse.json({ role: newRole })
  } catch (error) {
    console.error("Create role error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// PATCH: update a role
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

    const { roleId, name } = await req.json()
    if (!roleId || !name || typeof name !== "string" || name.trim().length < 1) {
      return NextResponse.json(
        { error: "roleId and name are required" },
        { status: 400 }
      )
    }

    const group = await db.collection("groups").findOne({
      _id: new ObjectId(groupId),
    })
    const roles: { id: string; name: string }[] = group?.roles ?? []
    const idx = roles.findIndex((r) => r.id === roleId)
    if (idx === -1) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }
    roles[idx] = { ...roles[idx], name: name.trim() }

    await db.collection("groups").updateOne(
      { _id: new ObjectId(groupId) },
      { $set: { roles } }
    )

    return NextResponse.json({ role: roles[idx] })
  } catch (error) {
    console.error("Update role error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// DELETE: delete a role
export async function DELETE(
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

    const { searchParams } = new URL(req.url)
    const roleId = searchParams.get("roleId")
    if (!roleId) {
      return NextResponse.json(
        { error: "roleId query param is required" },
        { status: 400 }
      )
    }

    const group = await db.collection("groups").findOne({
      _id: new ObjectId(groupId),
    })
    const roles: { id: string; name: string }[] = group?.roles ?? []
    const filtered = roles.filter((r) => r.id !== roleId)
    if (filtered.length === roles.length) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    await db.collection("groups").updateOne(
      { _id: new ObjectId(groupId) },
      { $set: { roles: filtered } }
    )

    // Remove roleId from all groupMemberships
    await db.collection("groupMemberships").updateMany(
      { groupId },
      { $pull: { roleIds: roleId } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete role error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
