import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getDb } from "@/lib/mongodb"
import { createSession } from "@/lib/auth"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

type GoogleUserInfo = {
  id: string
  email: string
  name?: string
  picture?: string
  verified_email: boolean
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      const errorMap: Record<string, string> = {
        access_denied: "access_denied",
        invalid_request: "invalid_request",
        unauthorized_client: "invalid_request",
      }
      const errorKey = errorMap[error] ?? "oauth_error"
      return NextResponse.redirect(`${APP_URL}/auth?error=${errorKey}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${APP_URL}/auth?error=invalid_callback`)
    }

    const cookieStore = await cookies()
    const storedState = cookieStore.get("oauth_state")?.value
    cookieStore.delete("oauth_state")

    if (!storedState || state !== storedState) {
      return NextResponse.redirect(`${APP_URL}/auth?error=invalid_state`)
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${APP_URL}/api/auth/google/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${APP_URL}/auth?error=oauth_not_configured`)
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error("Google token exchange failed:", err)
      return NextResponse.redirect(`${APP_URL}/auth?error=token_exchange_failed`)
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    if (!accessToken) {
      return NextResponse.redirect(`${APP_URL}/auth?error=token_exchange_failed`)
    }

    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!userInfoRes.ok) {
      console.error("Google userinfo failed:", userInfoRes.status)
      return NextResponse.redirect(`${APP_URL}/auth?error=userinfo_failed`)
    }

    const userInfo: GoogleUserInfo = await userInfoRes.json()
    const { id: googleId, email, name } = userInfo

    if (!email) {
      return NextResponse.redirect(`${APP_URL}/auth?error=no_email`)
    }

    const normalizedEmail = email.toLowerCase()
    const db = await getDb()

    let user = await db
      .collection("users")
      .findOne({ $or: [{ googleId }, { email: normalizedEmail }] })

    if (user) {
      // Account linking: if existing email user has no googleId, add it
      if (!user.googleId) {
        await db.collection("users").updateOne(
          { _id: user._id },
          { $set: { googleId, emailVerified: true } }
        )
      }
    } else {
      const result = await db.collection("users").insertOne({
        email: normalizedEmail,
        password: null,
        displayName: name?.trim() || normalizedEmail.split("@")[0],
        role: "athlete",
        groupId: null,
        profileComplete: true,
        authProvider: "google",
        googleId,
        emailVerified: true,
        createdAt: new Date(),
      })

      user = await db.collection("users").findOne({
        _id: result.insertedId,
      })
    }

    if (!user) {
      return NextResponse.redirect(`${APP_URL}/auth?error=user_creation_failed`)
    }

    await createSession({
      userId: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role || "athlete",
      groupId: user.groupId || undefined,
    })

    return NextResponse.redirect(`${APP_URL}/dashboard`)
  } catch (error) {
    console.error("Google callback error:", error)
    return NextResponse.redirect(`${APP_URL}/auth?error=oauth_error`)
  }
}
