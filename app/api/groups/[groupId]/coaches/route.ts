import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { safeObjectId } from "@/lib/objectid"

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

    const body = await req.json()
    const { coachId } = body
    if (!coachId || typeof coachId !== "string") {
      return NextResponse.json({ error: "coachId is required" }, { status: 400 })
    }

    const coachOid = safeObjectId(coachId)
    if (!coachOid) {
      return NextResponse.json({ error: "Invalid coachId" }, { status: 400 })
    }

    // Verify target is a coach in the club (in at least one of the head coach's groups)
    const headCoachGroups = await db
      .collection("groups")
      .find({ headCoachId: session.userId })
      .project({ _id: 1 })
      .toArray()
    const clubGroupIds = headCoachGroups.map((g) => g._id.toString())

    const targetCoach = await db.collection("users").findOne({
      _id: coachOid,
      role: "coach",
      groupIds: { $in: clubGroupIds },
    })
    if (!targetCoach) {
      return NextResponse.json(
        { error: "Coach not found in this club" },
        { status: 404 }
      )
    }

    await db
      .collection("groups")
      .updateOne({ _id: groupOid }, { $addToSet: { coachIds: coachId } as never })

    await db
      .collection("users")
      .updateOne({ _id: coachOid }, { $addToSet: { groupIds: groupId } as never })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("POST /api/groups/[groupId]/coaches:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
