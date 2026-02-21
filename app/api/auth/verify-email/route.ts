import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { createSession } from "@/lib/auth"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.redirect(`${APP_URL}/auth?error=missing_token`)
    }

    const db = await getDb()
    const pending = await db
      .collection("pending_signups")
      .findOne({ token })

    if (!pending) {
      return NextResponse.redirect(`${APP_URL}/auth?error=verification_expired`)
    }

    if (new Date() > pending.expiresAt) {
      await db.collection("pending_signups").deleteOne({ token })
      return NextResponse.redirect(`${APP_URL}/auth?error=verification_expired`)
    }

    // Check if user already exists (race condition)
    const existingUser = await db
      .collection("users")
      .findOne({ email: pending.email })
    if (existingUser) {
      await db.collection("pending_signups").deleteOne({ token })
      return NextResponse.redirect(`${APP_URL}/auth?error=already_exists`)
    }

    const result = await db.collection("users").insertOne({
      email: pending.email,
      password: pending.password,
      displayName: pending.displayName,
      role: pending.role,
      groupId: null,
      profileComplete: true,
      authProvider: "email",
      emailVerified: true,
      createdAt: new Date(),
    })

    await db.collection("pending_signups").deleteOne({ token })

    await createSession({
      userId: result.insertedId.toString(),
      email: pending.email,
      displayName: pending.displayName,
      role: pending.role,
      groupId: undefined,
    })

    return NextResponse.redirect(`${APP_URL}/dashboard`)
  } catch (error) {
    console.error("Verify email error:", error)
    return NextResponse.redirect(
      `${APP_URL}/auth?error=verification_failed`
    )
  }
}
