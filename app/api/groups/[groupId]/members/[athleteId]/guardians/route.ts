import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { canManageGroup } from "@/lib/api-auth"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ groupId: string; athleteId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId, athleteId } = await params
    const db = await getDb()

    if (!(await canManageGroup(db, session.userId, groupId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const athlete = await db.collection("users").findOne({
      _id: new ObjectId(athleteId),
    })
    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    const isMember =
      athlete.groupIds?.includes(groupId) || athlete.groupId === groupId
    if (!isMember) {
      return NextResponse.json(
        { error: "Athlete is not in this group" },
        { status: 400 }
      )
    }

    const links = await db
      .collection("guardianLinks")
      .find({ athleteId })
      .toArray()

    if (links.length === 0) {
      return NextResponse.json({ guardians: [] })
    }

    const guardianIds = (links as { guardianId: string }[]).map((l) => l.guardianId)
    const guardians = await db
      .collection("users")
      .find({
        _id: { $in: guardianIds.map((id) => new ObjectId(id)) },
        role: "guardian",
      })
      .project({ password: 0 })
      .toArray()

    return NextResponse.json({
      guardians: guardians.map((g) => ({
        id: g._id.toString(),
        displayName: (g.displayName ?? [g.firstName, g.lastName].filter(Boolean).join(" ")) || g.email,
        email: g.email,
      })),
    })
  } catch (error) {
    console.error("Get guardians error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
