import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, clubName, groups, superEarlyAccess, clickFrenzyCount } = await req.json()

    if (!firstName || !lastName || !email || !clubName) {
      return NextResponse.json({ error: "First name, last name, email, and club name are required" }, { status: 400 })
    }

    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()
    const trimmedClub = clubName.trim()

    if (!trimmedFirst || !trimmedLast || !trimmedClub) {
      return NextResponse.json({ error: "First name, last name, and club name are required" }, { status: 400 })
    }

    if (!Array.isArray(groups) || groups.length === 0 || groups[0]?.ageGroups?.length === 0) {
      return NextResponse.json({ error: "At least one group with an age group is required" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const name = `${trimmedFirst} ${trimmedLast}`

    const db = await getDb()

    const existing = await db.collection("waitlist").findOne({ email: normalizedEmail })
    if (existing) {
      return NextResponse.json(
        { error: "This email is already on the waitlist." },
        { status: 409 }
      )
    }

    await db.collection("waitlist").insertOne({
      email: normalizedEmail,
      name,
      firstName: trimmedFirst,
      lastName: trimmedLast,
      clubName: trimmedClub,
      groups,
      superEarlyAccess: superEarlyAccess === true,
      clickFrenzyCount: typeof clickFrenzyCount === "number" ? clickFrenzyCount : 0,
      status: "pending",
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
      return NextResponse.json(
        { error: "This email is already on the waitlist." },
        { status: 409 }
      )
    }
    console.error("POST /api/waitlist:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
