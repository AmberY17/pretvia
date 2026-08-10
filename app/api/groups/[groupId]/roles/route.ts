import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { canManageGroup } from "@/lib/api-auth"
import { safeObjectId } from "@/lib/objectid"

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
    const groupOid = safeObjectId(groupId)
    if (!groupOid) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 })
    }
    const db = await getDb()

    if (!(await canManageGroup(db, session.userId, groupId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const group = await db.collection("groups").findOne({ _id: groupOid })
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
    const groupOid = safeObjectId(groupId)
    if (!groupOid) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 })
    }
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

    const newRole = { id: crypto.randomUUID(), name: name.trim() }

    // $push rather than read-modify-write of the whole array: two co-coaches
    // adding a role at the same time would otherwise each write back the array
    // they read, and the slower write would silently drop the other's role.
    const result = await db
      .collection("groups")
      .updateOne({ _id: groupOid }, { $push: { roles: newRole } as never })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

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
    const groupOid = safeObjectId(groupId)
    if (!groupOid) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 })
    }
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

    // Positional update of just the matched element, so a concurrent add or
    // rename of a *different* role is preserved.
    const result = await db
      .collection("groups")
      .updateOne(
        { _id: groupOid, "roles.id": roleId },
        { $set: { "roles.$.name": name.trim() } },
      )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    return NextResponse.json({ role: { id: roleId, name: name.trim() } })
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
    const groupOid = safeObjectId(groupId)
    if (!groupOid) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 })
    }
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

    // $pull the one element instead of writing back a filtered copy of the array.
    const result = await db
      .collection("groups")
      .updateOne({ _id: groupOid }, { $pull: { roles: { id: roleId } } } as never)

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    // Remove roleId from all groupMemberships
    await db.collection("groupMemberships").updateMany(
      { groupId },
      // @ts-expect-error -- MongoDB $pull typing doesn't infer array element type
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
