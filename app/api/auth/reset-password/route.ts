import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDb } from "@/lib/mongodb"

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()

    // Strings only: an object like {"$ne": null} would act as a query operator and match any token.
    if (typeof token !== "string" || typeof password !== "string" || !token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const db = await getDb()
    // Claim atomically so a reset link works exactly once.
    const resetToken = await db
      .collection("password_reset_tokens")
      .findOneAndDelete({ token })

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      )
    }

    if (new Date() > new Date(resetToken.expiresAt)) {
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await db
      .collection("users")
      .updateOne(
        { email: resetToken.email },
        { $set: { password: hashedPassword, emailVerified: true } }
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
