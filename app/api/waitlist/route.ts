import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { waitlistSchema, validationError } from "@/lib/validation"
import { waitlistRateLimiter, getIp } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    if (waitlistRateLimiter) {
      const { success } = await waitlistRateLimiter.limit(getIp(req))
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 },
        )
      }
    }

    const parsed = waitlistSchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)

    const {
      firstName: trimmedFirst,
      lastName: trimmedLast,
      clubName: trimmedClub,
      email: normalizedEmail,
      groups,
    } = parsed.data

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
