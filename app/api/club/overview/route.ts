import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { getUserSubscription } from "@/lib/subscription"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const sub = await getUserSubscription(db, session.userId)

    if (sub.plan !== "club") {
      return NextResponse.json({ error: "Club plan required" }, { status: 403 })
    }

    const [groups, siteSettingsDoc] = await Promise.all([
      db
        .collection("groups")
        .find({ headCoachId: session.userId })
        .sort({ createdAt: -1 })
        .toArray(),
      db.collection("siteSettings").findOne({ key: "site" }),
    ])

    const groupIds = groups.map((g) => g._id.toString())

    // Fetch all coaches in these groups
    const coachUsers = await db
      .collection("users")
      .find({
        role: "coach",
        groupIds: { $in: groupIds },
      })
      .toArray()

    // Fetch pending coach invites for these groups
    const pendingInvites = await db
      .collection("invites")
      .find({
        groupId: { $in: groupIds },
        type: "coach",
        expiresAt: { $gt: new Date() },
      })
      .toArray()

    // Fetch athlete counts per group
    const athleteCounts = await db
      .collection("users")
      .aggregate([
        { $match: { role: "athlete", groupIds: { $in: groupIds } } },
        { $unwind: "$groupIds" },
        { $match: { groupIds: { $in: groupIds } } },
        { $group: { _id: "$groupIds", count: { $sum: 1 } } },
      ])
      .toArray()
    const athleteCountMap = new Map(athleteCounts.map((a) => [a._id, a.count as number]))

    // Weekly log counts (this week vs last week)
    const now = new Date()
    const startOfThisWeek = new Date(now)
    startOfThisWeek.setDate(now.getDate() - now.getDay())
    startOfThisWeek.setHours(0, 0, 0, 0)

    const startOfLastWeek = new Date(startOfThisWeek)
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7)

    // Find athlete IDs in these groups
    const athletesInClub = await db
      .collection("users")
      .find({ role: "athlete", groupIds: { $in: groupIds } })
      .project({ _id: 1 })
      .toArray()
    const athleteIds = athletesInClub.map((a) => a._id.toString())

    const [weeklyLogCount, prevWeeklyLogCount] = await Promise.all([
      db.collection("logs").countDocuments({
        userId: { $in: athleteIds },
        timestamp: { $gte: startOfThisWeek.toISOString() },
      }),
      db.collection("logs").countDocuments({
        userId: { $in: athleteIds },
        timestamp: {
          $gte: startOfLastWeek.toISOString(),
          $lt: startOfThisWeek.toISOString(),
        },
      }),
    ])

    const clubGroups = groups.map((g) => {
      const gid = g._id.toString()

      const coaches = coachUsers
        .filter((u) => {
          const userGroupIds: string[] = Array.isArray(u.groupIds) ? u.groupIds : []
          return userGroupIds.includes(gid)
        })
        .map((u) => ({
          id: u._id.toString(),
          displayName: u.displayName ?? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
          email: u.email,
          isHead: u._id.toString() === session.userId,
        }))

      const pendingCoachInvites = pendingInvites
        .filter((inv) => inv.groupId === gid)
        .map((inv) => ({
          id: inv._id.toString(),
          email: inv.email,
          token: inv.token,
          expiresAt: (inv.expiresAt as Date).toISOString(),
        }))

      return {
        id: gid,
        name: g.name,
        code: g.code,
        athleteCount: athleteCountMap.get(gid) ?? 0,
        coaches,
        pendingCoachInvites,
      }
    })

    return NextResponse.json({
      groups: clubGroups,
      weeklyLogCount,
      prevWeeklyLogCount,
      subscription: {
        plan: sub.plan,
        isAssistant: sub.isAssistant ?? false,
        addOnGroups: sub.addOnGroups,
        addOnSeats: sub.addOnSeats,
      },
      addOnsVisible: siteSettingsDoc?.addOnsVisible ?? true,
    })
  } catch (err) {
    console.error("GET /api/club/overview:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
