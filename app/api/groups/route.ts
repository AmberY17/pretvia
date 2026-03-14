import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { safeObjectId } from "@/lib/objectid"
import {
  handleCreate,
  handleJoin,
  handleSwitch,
  handleLeave,
} from "./post-handlers"

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

    if (action === "create") return handleCreate(db, session, body)
    if (action === "join") return handleJoin(db, session, body)
    if (action === "switch") return handleSwitch(db, session, body)
    if (action === "leave") return handleLeave(db, session)

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Groups error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
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

    if (mode === "coach-groups") {
      const groups = await db
        .collection("groups")
        .find({
          $or: [{ coachId: session.userId }, { coachIds: session.userId }],
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

    if (mode === "my-groups") {
      const user = await db.collection("users").findOne({
        _id: new ObjectId(session.userId),
      })

      if (!user) {
        return NextResponse.json({ groups: [] })
      }

      const groupIds = Array.isArray(user.groupIds) ? user.groupIds : []
      if (user.groupId && !groupIds.includes(user.groupId)) {
        groupIds.push(user.groupId)
      }

      if (groupIds.length === 0) {
        return NextResponse.json({ groups: [] })
      }

      const groups = await db
        .collection("groups")
        .find({
          _id: { $in: groupIds.map((id: string) => new ObjectId(id)) },
        })
        .toArray()

      return NextResponse.json({
        groups: groups.map((g) => ({
          id: g._id.toString(),
          name: g.name,
          code: g.code,
          coachId: g.coachId,
          trainingScheduleUpdatedAt: g.trainingScheduleUpdatedAt ?? null,
        })),
      })
    }

    // Default: fetch members for a specific group
    if (!groupId) {
      return NextResponse.json({ members: [], roles: [] })
    }
    const groupOid = safeObjectId(groupId)
    if (!groupOid) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 })
    }

    const group = await db.collection("groups").findOne({ _id: groupOid })
    const roles = group?.roles ?? []

    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })
    const isCoachOfGroup =
      user?.role === "coach" &&
      group &&
      ((Array.isArray(group.coachIds) &&
        group.coachIds.includes(session.userId)) ||
        group.coachId === session.userId ||
        (Array.isArray(user?.groupIds) && user.groupIds.includes(groupId)))

    const members = await db
      .collection("users")
      .find({ $or: [{ groupIds: groupId }, { groupId: groupId }] })
      .project({ password: 0 })
      .toArray()

    const membershipDocs = await db
      .collection("groupMemberships")
      .find({
        groupId,
        userId: { $in: members.map((m) => m._id.toString()) },
      })
      .toArray()
    const roleIdsByUser = new Map(
      (
        membershipDocs as unknown as {
          userId: string
          roleIds?: string[]
        }[]
      ).map((m) => [m.userId, m.roleIds ?? []]),
    )

    // Pending athletes from non-expired invites (coach view only)
    let pendingAthletes: {
      id: string
      displayName: string
      email: string
      status: "pending"
    }[] = []
    if (isCoachOfGroup) {
      const now = new Date()
      const invites = await db
        .collection("invites")
        .find({
          groupId,
          expiresAt: { $gt: now },
          type: { $in: ["athlete", "under13_parent"] },
        })
        .toArray()
      const inviteList = invites as unknown as {
        _id: unknown
        token: string
        type: string
        email: string
        athleteNamePlaceholder?: string
      }[]
      pendingAthletes = inviteList.map((inv) => ({
        id: `pending-${inv.token}`,
        displayName:
          inv.athleteNamePlaceholder?.trim() ||
          (inv.type === "athlete" ? inv.email : "Pending"),
        email: inv.email,
        status: "pending" as const,
      }))
    }

    const response: {
      members: {
        id: string
        displayName: string
        email: string
        role: string
        roleIds: string[]
        firstName?: string
        lastName?: string
        dateOfBirth?: string
      }[]
      roles: unknown[]
      pendingAthletes?: {
        id: string
        displayName: string
        email: string
        status: "pending"
      }[]
      trainingScheduleTemplate?: { dayOfWeek: number; time: string }[]
    } = {
      members: members.map((m) => ({
        id: m._id.toString(),
        displayName: m.displayName,
        email: m.email,
        role: m.role || "athlete",
        roleIds: roleIdsByUser.get(m._id.toString()) ?? [],
        firstName: m.firstName,
        lastName: m.lastName,
        dateOfBirth: m.dateOfBirth,
      })),
      roles,
      ...(pendingAthletes.length > 0 && { pendingAthletes }),
    }
    if (isCoachOfGroup && Array.isArray(group?.trainingScheduleTemplate)) {
      response.trainingScheduleTemplate = group.trainingScheduleTemplate as {
        dayOfWeek: number
        time: string
      }[]
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error("Get group members error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    )
  }
}
