import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get("groupId") ?? null

    const db = await getDb()

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const todayLogFilter: Record<string, unknown> = {
      userId: session.userId,
      createdAt: { $gte: startOfToday, $lt: endOfToday },
      checkinId: { $exists: false },
    }
    if (groupId) {
      todayLogFilter.groupId = groupId
    }

    const todayLogs = await db.collection("logs").find(todayLogFilter)
      .project({ _id: 1, visibility: 1, isGroup: 1 }).toArray()

    let sharedLogId: string | null = null
    let privateLogId: string | null = null

    for (const log of todayLogs) {
      const isShared = log.visibility === "coach" || (!log.visibility && log.isGroup === true)
      const isPrivate = log.visibility === "private" || (!log.visibility && log.isGroup !== true)
      if (isShared && !sharedLogId) sharedLogId = log._id.toString()
      if (isPrivate && !privateLogId) privateLogId = log._id.toString()
    }

    return NextResponse.json({ sharedLogId, privateLogId })
  } catch (error) {
    console.error("Get today logs error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
