import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

type TrainingSlot = { dayOfWeek: number; time: string; sourceGroupId?: string }

function computeTrainingDayDates(
  slots: TrainingSlot[] | undefined,
  start: Date,
  end: Date
): Record<string, true> {
  const out: Record<string, true> = {}
  if (!Array.isArray(slots) || slots.length === 0) return out
  const dayOfWeeks = new Set(slots.map((s) => s.dayOfWeek))
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endTime = end.getTime()
  while (cur.getTime() <= endTime) {
    if (dayOfWeeks.has(cur.getDay())) {
      out[toDateKey(cur)] = true
    }
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    })

    if (!user || user.role !== "guardian") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const links = await db
      .collection("guardianLinks")
      .find({ guardianId: session.userId })
      .toArray()
    const athleteIds = (links as { athleteId: string }[]).map((l) => l.athleteId)

    if (athleteIds.length === 0) {
      return NextResponse.json({
        availablePairs: [],
        athletes: [],
        dates: {},
        attendanceByDate: {},
        calendars: [],
      })
    }

    const athletes = await db
      .collection("users")
      .find({ _id: { $in: athleteIds.map((id) => new ObjectId(id)) } })
      .project({ _id: 1, displayName: 1, firstName: 1, lastName: 1, email: 1, groupId: 1, groupIds: 1, trainingSlots: 1 })
      .toArray()

    const athleteMap = new Map(
      athletes.map((a) => [
        a._id.toString(),
        {
          id: a._id.toString(),
          name: (a.displayName ?? ([a.firstName, a.lastName].filter(Boolean).join(" ") || a.email || "Athlete")) as string,
          groupIds: [
            ...(a.groupId ? [a.groupId] : []),
            ...(Array.isArray(a.groupIds) ? a.groupIds : []),
          ].filter((id, i, arr) => arr.indexOf(id) === i),
          trainingSlots: Array.isArray(a.trainingSlots)
            ? (a.trainingSlots as TrainingSlot[])
            : [],
        },
      ])
    )

    const allGroupIds = new Set<string>()
    for (const a of athleteMap.values()) {
      a.groupIds.forEach((id: string) => allGroupIds.add(id))
    }

    const groups = await db
      .collection("groups")
      .find({ _id: { $in: [...allGroupIds].map((id) => new ObjectId(id)) } })
      .project({ _id: 1, name: 1 })
      .toArray()

    const groupMap = new Map(groups.map((g) => [g._id.toString(), g.name as string]))

    const availablePairs: { athleteId: string; athleteName: string; groupId: string; groupName: string }[] = []
    for (const a of athleteMap.values()) {
      for (const gid of a.groupIds) {
        const gname = groupMap.get(gid) ?? "Group"
        availablePairs.push({
          athleteId: a.id,
          athleteName: a.name,
          groupId: gid,
          groupName: gname,
        })
      }
    }

    const { searchParams } = new URL(req.url)
    const month = searchParams.get("month")
    const weekStart = searchParams.get("weekStart")
    const pairsParam = searchParams.get("pairs")

    let start: Date
    let end: Date
    if (weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      const [y, m, day] = weekStart.split("-").map(Number)
      const d = new Date(y, m - 1, day)
      const dayOfWeek = d.getDay()
      const diff = d.getDate() - dayOfWeek
      start = new Date(y, m - 1, diff)
      end = new Date(start)
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
    } else if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number)
      start = new Date(y, m - 1, 1)
      end = new Date(y, m, 0, 23, 59, 59, 999)
    } else {
      const now = new Date()
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }

    const parsePairs = (): { athleteId: string; groupId: string }[] => {
      if (!pairsParam || !pairsParam.trim()) return []
      const valid = new Set(availablePairs.map((p) => `${p.athleteId}:${p.groupId}`))
      return pairsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const [aid, gid] = s.split(":")
          return aid && gid && valid.has(`${aid}:${gid}`) ? { athleteId: aid, groupId: gid } : null
        })
        .filter((p): p is { athleteId: string; groupId: string } => p !== null)
    }

    const requestedPairs = parsePairs()

    if (requestedPairs.length > 0) {
      const uniqueGroupIds = [...new Set(requestedPairs.map((p) => p.groupId))]
      const uniqueAthleteIds = [...new Set(requestedPairs.map((p) => p.athleteId))]

      const checkins = await db
        .collection("checkins")
        .find({
          groupId: { $in: uniqueGroupIds },
          sessionDate: { $gte: start, $lte: end },
        })
        .project({ _id: 1, groupId: 1, sessionDate: 1 })
        .toArray()

      const checkinIds = checkins.map((c) => c._id.toString())
      const [logs, attendanceDocs] = await Promise.all([
        db
          .collection("logs")
          .find({
            userId: { $in: uniqueAthleteIds },
            timestamp: { $gte: start, $lte: end },
          })
          .project({ userId: 1, emoji: 1, timestamp: 1 })
          .toArray(),
        checkinIds.length > 0
          ? db.collection("attendance").find({ checkinId: { $in: checkinIds } }).toArray()
          : Promise.resolve([]),
      ])

      const checkinsByGroup = new Map<string, { _id: ObjectId; sessionDate: Date }[]>()
      for (const c of checkins) {
        const gid = typeof c.groupId === "string" ? c.groupId : (c.groupId as ObjectId).toString()
        if (!checkinsByGroup.has(gid)) checkinsByGroup.set(gid, [])
        checkinsByGroup.get(gid)!.push({ _id: c._id, sessionDate: c.sessionDate as Date })
      }

      const logsByAthlete = new Map<string, { emoji: string; timestamp: Date }[]>()
      for (const log of logs) {
        const uid = typeof log.userId === "string" ? log.userId : (log.userId as ObjectId).toString()
        if (!logsByAthlete.has(uid)) logsByAthlete.set(uid, [])
        logsByAthlete.get(uid)!.push({
          emoji: (log.emoji as string) ?? "📝",
          timestamp: log.timestamp as Date,
        })
      }

      const checkinIdSet = new Set(checkins.map((c) => c._id.toString()))
      const attendanceByCheckin = new Map<string, { sessionDate: Date; entries: { userId: string; status: string }[] }>()
      for (const att of attendanceDocs) {
        const cid = typeof att.checkinId === "string" ? att.checkinId : (att.checkinId as ObjectId).toString()
        if (checkinIdSet.has(cid)) {
          const sessDate = att.sessionDate as Date
          const entries = (att.entries ?? []) as { userId: string; status: string }[]
          attendanceByCheckin.set(cid, { sessionDate: sessDate, entries })
        }
      }

      const calendars: {
        athleteId: string
        groupId: string
        athleteName: string
        groupName: string
        dates: Record<string, string>
        attendanceByDate: Record<string, "present" | "absent" | "excused">
        trainingDayDates: Record<string, true>
      }[] = []

      for (const { athleteId, groupId } of requestedPairs) {
        const pair = availablePairs.find((p) => p.athleteId === athleteId && p.groupId === groupId)
        if (!pair) continue

        const pairCheckins = checkinsByGroup.get(groupId) ?? []
        const pairLogs = logsByAthlete.get(athleteId) ?? []
        const athlete = athleteMap.get(athleteId)
        const trainingDayDates = computeTrainingDayDates(athlete?.trainingSlots ?? [], start, end)

        const dates: Record<string, string> = {}
        for (const log of pairLogs) {
          const key = toDateKey(log.timestamp)
          if (!dates[key]) dates[key] = log.emoji
        }

        const attendanceByDate: Record<string, "present" | "absent" | "excused"> = {}
        for (const c of pairCheckins) {
          const att = attendanceByCheckin.get(c._id.toString())
          if (!att) continue
          const dateKey = toDateKey(att.sessionDate)
          const entry = att.entries.find(
            (e) => e.userId === athleteId && ["present", "absent", "excused"].includes(e.status)
          )
          if (entry) attendanceByDate[dateKey] = entry.status as "present" | "absent" | "excused"
        }

        calendars.push({
          athleteId,
          groupId,
          athleteName: pair.athleteName,
          groupName: pair.groupName,
          dates,
          attendanceByDate,
          trainingDayDates,
        })
      }

      return NextResponse.json({
        availablePairs,
        calendars,
      })
    }

    const athleteId = searchParams.get("athleteId")
    const filterAthleteIds = athleteId && athleteIds.includes(athleteId) ? [athleteId] : athleteIds

    const logs = await db
      .collection("logs")
      .find({
        userId: { $in: filterAthleteIds },
        timestamp: { $gte: start, $lte: end },
      })
      .project({ userId: 1, emoji: 1, timestamp: 1 })
      .toArray()

    const dates: Record<string, string> = {}
    for (const log of logs) {
      const d = new Date(log.timestamp as Date)
      const key = toDateKey(d)
      const uid = typeof log.userId === "string" ? log.userId : (log.userId as ObjectId).toString()
      if (filterAthleteIds.includes(uid)) {
        dates[key] = (log.emoji as string) ?? "📝"
      }
    }

    const attendanceByDate: Record<string, "present" | "absent" | "excused"> = {}
    if (filterAthleteIds.length === 1) {
      const athletesWithGroups = await db
        .collection("users")
        .find({ _id: { $in: filterAthleteIds.map((id) => new ObjectId(id)) } })
        .project({ _id: 1, groupId: 1, groupIds: 1 })
        .toArray()
      const groupIds = new Set<string>()
      for (const a of athletesWithGroups) {
        const gid = (a as { groupId?: string; groupIds?: string[] }).groupId
        const gids = (a as { groupIds?: string[] }).groupIds
        if (gid) groupIds.add(gid)
        if (Array.isArray(gids)) gids.forEach((id: string) => groupIds.add(id))
      }
      if (groupIds.size > 0) {
        const checkins = await db
          .collection("checkins")
          .find({
            groupId: { $in: [...groupIds] },
            sessionDate: { $gte: start, $lte: end },
          })
          .project({ _id: 1, sessionDate: 1 })
          .toArray()
        const checkinIds = checkins.map((c) => c._id.toString())
        const attendanceDocs = await db
          .collection("attendance")
          .find({ checkinId: { $in: checkinIds } })
          .toArray()
        for (const att of attendanceDocs) {
          const sessDate = att.sessionDate as Date
          const dateKey = sessDate ? toDateKey(sessDate) : ""
          if (!dateKey) continue
          const entries = (att.entries ?? []) as { userId: string; status: string }[]
          for (const e of entries) {
            if (filterAthleteIds.includes(e.userId) && ["present", "absent", "excused"].includes(e.status)) {
              attendanceByDate[dateKey] = e.status as "present" | "absent" | "excused"
              break
            }
          }
        }
      }
    }

    return NextResponse.json({
      availablePairs,
      athletes: athletes.map((a) => ({
        id: a._id.toString(),
        name: (a.displayName ?? ([a.firstName, a.lastName].filter(Boolean).join(" ") || a.email || "Athlete")) as string,
      })),
      dates,
      attendanceByDate,
      calendars: [],
    })
  } catch (error) {
    console.error("Guardian calendar error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
