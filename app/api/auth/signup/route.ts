import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { getDb } from "@/lib/mongodb"
import { createSession } from "@/lib/auth"
import { isTestAccount } from "@/lib/auth-config"
import { sendVerificationEmail } from "@/lib/resend"
import { signupRateLimiter, getIp } from "@/lib/rate-limit"
import { betaFlag } from "@/flags"

export async function POST(req: Request) {
  try {
    if (signupRateLimiter) {
      const { success } = await signupRateLimiter.limit(getIp(req))
      if (!success) {
        return NextResponse.json(
          { error: "Too many signup attempts. Please try again later." },
          { status: 429 },
        )
      }
    }

    const {
      email,
      password,
      displayName,
      firstName,
      lastName,
      dateOfBirth,
      role,
      waitlistToken,
      coachInviteToken,
    } = await req.json()

    // Type guards before normalization: a non-string email made `.toLowerCase()`
    // throw, surfacing as a 500 instead of the documented 400.
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const fn = (firstName ?? "").trim()
    const ln = (lastName ?? "").trim()
    const name = displayName ?? (fn && ln ? `${fn} ${ln}` : fn || ln)
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "First and last name (or display name) are required" },
        { status: 400 },
      )
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const db = await getDb()
    const normalizedEmail = email.trim().toLowerCase()
    const existingUser = await db.collection("users").findOne({ email: normalizedEmail })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      )
    }

    const userRole = role === "coach" ? "coach" : "athlete"
    const beta = await betaFlag()

    // Waitlist gate: in beta mode, coach sign-ups require either an approved waitlist token or a coach invite token
    let waitlistEntryId: import("mongodb").ObjectId | null = null
    if (beta && userRole === "coach" && !isTestAccount(normalizedEmail)) {
      // Coach invite path: bypass waitlist if a valid coach invite exists for this email
      if (coachInviteToken) {
        const coachInvite = await db.collection("invites").findOne({
          token: coachInviteToken,
          type: "coach",
          expiresAt: { $gt: new Date() },
        })
        if (!coachInvite || coachInvite.email?.toLowerCase() !== normalizedEmail) {
          return NextResponse.json(
            { error: "Invalid or expired coach invite token." },
            { status: 403 },
          )
        }
        // Valid coach invite — allow signup to proceed; group linkage happens at redeem time
      } else {
        if (!waitlistToken) {
          return NextResponse.json(
            { error: "Coach sign-ups require a waitlist invite token." },
            { status: 403 },
          )
        }
        const entry = await db.collection("waitlist").findOne({
          inviteToken: waitlistToken,
          status: "approved",
        })
        if (!entry) {
          return NextResponse.json({ error: "Invalid or expired invite token." }, { status: 403 })
        }
        if (entry.usedAt) {
          return NextResponse.json({ error: "This invite has already been used." }, { status: 403 })
        }
        if (new Date() > entry.inviteExpiresAt) {
          return NextResponse.json({ error: "Your invite link has expired." }, { status: 403 })
        }
        waitlistEntryId = entry._id
      }
    }

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
        activeGroupId: null,
        profileComplete: true,
        authProvider: "email",
        emailVerified: true,
        createdAt: new Date(),
        subscription: { plan: "club", isAssistant: false, addOnGroups: 0, addOnSeats: 0 },
      })

      await createSession({
        userId: result.insertedId.toString(),
        email: normalizedEmail,
        displayName: name,
        role: userRole,
        activeGroupId: undefined,
      })

      return NextResponse.json({
        success: true,
        user: {
          id: result.insertedId.toString(),
          email: normalizedEmail,
          displayName: name,
          role: userRole,
          activeGroupId: null,
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
      // Beta: coaches who sign up via waitlist get Club plan; non-beta coaches get Squad (Stripe placeholder)
      ...(userRole === "coach" && !isTestAccount(normalizedEmail)
        ? {
            subscription:
              beta && waitlistEntryId
                ? { plan: "club", isAssistant: false, addOnGroups: 0, addOnSeats: 0 }
                : { plan: "squad", isAssistant: false, addOnGroups: 0, addOnSeats: 0 },
          }
        : {}),
    })

    // Mark waitlist token as used (single-use)
    if (waitlistEntryId) {
      await db
        .collection("waitlist")
        .updateOne({ _id: waitlistEntryId }, { $set: { usedAt: new Date() } })
    }

    const sendResult = await sendVerificationEmail(normalizedEmail, token)
    if (!sendResult.ok) {
      return NextResponse.json(
        { error: sendResult.error ?? "Failed to send verification email" },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Check your email to verify your account.",
      requiresVerification: true,
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
