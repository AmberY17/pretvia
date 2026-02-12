import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ user: null })
    }

    const db = await getDb()
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    if (!user) {
      return NextResponse.json({ user: null })
    }

    // Ensure groupIds is in sync
    let groupIds: string[] = Array.isArray(user.groupIds) ? user.groupIds : []
    if (user.groupId && !groupIds.includes(user.groupId)) {
      groupIds = [...groupIds, user.groupId]
      await db.collection("users").updateOne(
        { _id: new ObjectId(session.userId) },
        { $set: { groupIds } }
      )
    }

    // If user is in a group, fetch active group info
    let group = null
    if (user.groupId) {
      const groupDoc = await db.collection("groups").findOne({
        _id: new ObjectId(user.groupId),
      })
      if (groupDoc) {
        group = {
          id: groupDoc._id.toString(),
          name: groupDoc.name,
          code: groupDoc.code,
          coachId: groupDoc.coachId,
        }
      }
    }

    // Fetch all groups the user is a member of
    let groups: { id: string; name: string; code: string; coachId: string }[] = []
    if (groupIds.length > 0) {
      const groupDocs = await db
        .collection("groups")
        .find({ _id: { $in: groupIds.map((id) => new ObjectId(id)) } })
        .toArray()
      groups = groupDocs.map((g) => ({
        id: g._id.toString(),
        name: g.name,
        code: g.code,
        coachId: g.coachId,
      }))
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role || "athlete",
        groupId: user.groupId || null,
        group,
        groups,
        groupIds,
        profileComplete: user.profileComplete,
      },
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}
