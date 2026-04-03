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
    if (user.activeGroupId && !groupIds.includes(user.activeGroupId)) {
      groupIds = [...groupIds, user.activeGroupId]
      await db.collection("users").updateOne(
        { _id: new ObjectId(session.userId) },
        { $set: { groupIds } }
      )
    }

    // If user is in a group, fetch active group info
    let group = null
    if (user.activeGroupId) {
      const groupDoc = await db.collection("groups").findOne({
        _id: new ObjectId(user.activeGroupId),
      })
      if (groupDoc) {
        group = {
          id: groupDoc._id.toString(),
          name: groupDoc.name,
          code: groupDoc.code,
          headCoachId: groupDoc.headCoachId,
        }
      }
    }

    // Fetch all groups the user is a member of
    let groups: { id: string; name: string; code: string; headCoachId: string }[] = []
    if (groupIds.length > 0) {
      const groupDocs = await db
        .collection("groups")
        .find({ _id: { $in: groupIds.map((id) => new ObjectId(id)) } })
        .toArray()
      groups = groupDocs.map((g) => ({
        id: g._id.toString(),
        name: g.name,
        code: g.code,
        headCoachId: g.headCoachId,
      }))
    }

    // For guardians: fetch linked athlete IDs
    let linkedAthleteIds: string[] = []
    if (user.role === "guardian") {
      const links = await db
        .collection("guardianLinks")
        .find({ guardianId: user._id.toString() })
        .toArray()
      linkedAthleteIds = links.map((l) => l.athleteId as string)
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role || "athlete",
        activeGroupId: user.activeGroupId || null,
        group,
        groups,
        groupIds,
        linkedAthleteIds: user.role === "guardian" ? linkedAthleteIds : undefined,
        profileComplete: user.profileComplete,
        profileEmoji: user.profileEmoji || null,
        trainingSlots: user.trainingSlots ?? [],
        subscription: user.subscription
          ? {
              plan: user.subscription.plan ?? "squad",
              isAssistant: user.subscription.isAssistant ?? false,
              addOnGroups: user.subscription.addOnGroups ?? 0,
              addOnSeats: user.subscription.addOnSeats ?? 0,
            }
          : { plan: "squad", isAssistant: false, addOnGroups: 0, addOnSeats: 0 },
      },
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}
