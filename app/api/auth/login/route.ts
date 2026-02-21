import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDb } from "@/lib/mongodb"
import { createSession } from "@/lib/auth"
import { isTestAccount } from "@/lib/auth-config"

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const user = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() })

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Google-only users have no password; they must use Google sign-in
    if (!user.password) {
      return NextResponse.json(
        { error: "This account uses Google sign-in. Please sign in with Google." },
        { status: 401 }
      )
    }

    // Require email verification unless test account
    const canSkipVerification = isTestAccount(user.email)
    const isVerified = user.emailVerified === true
    if (!canSkipVerification && !isVerified) {
      return NextResponse.json(
        { error: "Please verify your email first. Check your inbox for the verification link." },
        { status: 403 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    await createSession({
      userId: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role || "athlete",
      groupId: user.groupId || undefined,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role || "athlete",
        groupId: user.groupId || null,
        profileComplete: user.profileComplete,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
