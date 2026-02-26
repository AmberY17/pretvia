import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getDb } from "@/lib/mongodb"
import { sendPasswordResetEmail } from "@/lib/resend"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const normalizedEmail = email.toLowerCase()
    const user = await db.collection("users").findOne({ email: normalizedEmail })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true })
    }

    // Google-only accounts have no password to reset
    if (!user.password) {
      return NextResponse.json({ success: true })
    }

    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Replace any existing reset token for this email
    await db.collection("password_reset_tokens").deleteMany({ email: normalizedEmail })
    await db.collection("password_reset_tokens").insertOne({
      email: normalizedEmail,
      token,
      expiresAt,
      createdAt: new Date(),
    })

    const result = await sendPasswordResetEmail(normalizedEmail, token)
    if (!result.ok) {
      console.error("Failed to send password reset email:", result.error)
      return NextResponse.json(
        { error: "Failed to send reset email. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
