import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import type { Db } from "mongodb"
import { ObjectId } from "mongodb"
import {
  applyGroupTrainingScheduleToAllMembers,
  normalizeGroupTrainingSchedule,
} from "@/lib/group-training-schedule"

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

// GET: fetch group training schedule template (coach only)
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

    const trainingScheduleTemplate =
      (group?.trainingScheduleTemplate as { dayOfWeek: number; time: string }[]) ?? []

    return NextResponse.json({
      trainingScheduleTemplate,
      trainingScheduleUpdatedAt: group?.trainingScheduleUpdatedAt ?? null,
    })
  } catch (error) {
    console.error("Get group training schedule error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// PUT: update group training schedule template and apply to members (coach only)
export async function PUT(
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
    const { trainingSchedule } = body as {
      trainingSchedule: { dayOfWeek: number; time: string }[] | unknown
    }

    const normalized = normalizeGroupTrainingSchedule(trainingSchedule)

    await db.collection("groups").updateOne(
      { _id: new ObjectId(groupId) },
      {
        $set: {
          trainingScheduleTemplate: normalized,
          trainingScheduleUpdatedAt: new Date(),
        },
      }
    )

    await applyGroupTrainingScheduleToAllMembers(db, groupId, normalized)

    return NextResponse.json({
      success: true,
      trainingScheduleTemplate: normalized,
    })
  } catch (error) {
    console.error("Update group training schedule error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

