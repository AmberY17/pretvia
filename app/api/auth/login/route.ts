import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDb } from "@/lib/mongodb"
import { createSession } from "@/lib/auth"
import { isTestAccount } from "@/lib/auth-config"
import { loginRateLimiter, getIp } from "@/lib/rate-limit"

// A precomputed bcrypt hash with no matching plaintext, compared against when
// there's no real password to check (unknown user / Google-only account) so
// those responses take roughly as long as a genuine wrong-password attempt —
// closes the timing side-channel that would otherwise reveal account
// existence/type before any password is checked.
const DUMMY_PASSWORD_HASH =
  "$2a$10$f0N07jjZk.W1AHRvSpPZpeXeF6aISXGuoGlmPoLBcR8RXw2G.Vrxy"

export async function POST(req: Request) {
  try {
    if (loginRateLimiter) {
      const { success } = await loginRateLimiter.limit(getIp(req))
      if (!success) {
        return NextResponse.json(
          { error: "Too many login attempts. Please try again later." },
          { status: 429 }
        )
      }
    }

    const { email, password } = await req.json()

    // Type guards before normalization: a non-string email made `.toLowerCase()`
    // throw, surfacing as a 500 instead of the documented 400.
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    // Trimmed as well as lowercased — signup stores the trimmed form, so without
    // this an address typed with a trailing space would never match at login.
    const user = await db
      .collection("users")
      .findOne({ email: email.trim().toLowerCase() })

    if (!user) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH)
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Google-only users have no password; they must use Google sign-in
    if (!user.password) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH)
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
      activeGroupId: user.activeGroupId || undefined,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role || "athlete",
        activeGroupId: user.activeGroupId || null,
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
