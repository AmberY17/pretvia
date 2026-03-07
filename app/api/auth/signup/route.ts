import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { getDb } from "@/lib/mongodb"
import { createSession } from "@/lib/auth"
import { isTestAccount } from "@/lib/auth-config"
import { sendVerificationEmail } from "@/lib/resend"

export async function POST(req: Request) {
  try {
    const { email, password, displayName, firstName, lastName, dateOfBirth, role } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const fn = (firstName ?? "").trim()
    const ln = (lastName ?? "").trim()
    const name = displayName ?? (fn && ln ? `${fn} ${ln}` : fn || ln)
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "First and last name (or display name) are required" },
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
    const normalizedEmail = email.toLowerCase()
    const existingUser = await db
      .collection("users")
      .findOne({ email: normalizedEmail })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const userRole = role === "coach" ? "coach" : "athlete"

    // Test accounts: create user immediately, skip verification
    if (isTestAccount(normalizedEmail)) {
      const hashedPassword = await bcrypt.hash(password, 12)
      const result = await db.collection("users").insertOne({
        email: normalizedEmail,
        password: hashedPassword,
        displayName: name,
        firstName: fn || undefined,
        lastName: ln || undefined,
        dateOfBirth: dateOfBirth ?? null,
        role: userRole,
        groupId: null,
        profileComplete: true,
        authProvider: "email",
        emailVerified: true,
        createdAt: new Date(),
      })

      await createSession({
        userId: result.insertedId.toString(),
        email: normalizedEmail,
        displayName: name,
        role: userRole,
        groupId: undefined,
      })

      return NextResponse.json({
        success: true,
        user: {
          id: result.insertedId.toString(),
          email: normalizedEmail,
          displayName: name,
          role: userRole,
          groupId: null,
          profileComplete: true,
        },
      })
    }

    // Regular accounts: save to pending_signups and send magic link
    const hashedPassword = await bcrypt.hash(password, 12)
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Replace any existing pending signup for this email
    await db.collection("pending_signups").deleteMany({ email: normalizedEmail })

    await db.collection("pending_signups").insertOne({
      email: normalizedEmail,
      password: hashedPassword,
      displayName: name,
      firstName: fn || undefined,
      lastName: ln || undefined,
      dateOfBirth: dateOfBirth ?? null,
      role: userRole,
      token,
      expiresAt,
    })

    const sendResult = await sendVerificationEmail(normalizedEmail, token)
    if (!sendResult.ok) {
      return NextResponse.json(
        { error: sendResult.error ?? "Failed to send verification email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Check your email to verify your account.",
      requiresVerification: true,
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
