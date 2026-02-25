import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { applyGroupTrainingScheduleToUser } from "@/lib/group-training-schedule"

/**
 * POST: Sync the current group's training schedule into the athlete's schedule.
 * Keeps all custom (non-group) slots; replaces group slots with the latest template.
 */
export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const groupId = session.groupId
    if (!groupId) {
      return NextResponse.json(
        { error: "You are not in a group" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const group = await db.collection("groups").findOne({
      _id: new ObjectId(groupId),
    })

    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      )
    }

    const template = Array.isArray(group.trainingScheduleTemplate)
      ? (group.trainingScheduleTemplate as { dayOfWeek: number; time: string }[])
      : []

    await applyGroupTrainingScheduleToUser(
      db,
      session.userId,
      groupId,
      template
    )

    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })
    const trainingSlots = Array.isArray(user?.trainingSlots)
      ? (user.trainingSlots as { dayOfWeek: number; time: string; sourceGroupId?: string }[])
      : []

    return NextResponse.json({
      success: true,
      message: "Group schedule synced",
      trainingSlots,
    })
  } catch (error) {
    console.error("Sync group schedule error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
