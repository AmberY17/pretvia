import { NextResponse } from "next/server"
import { randomBytes } from "crypto"

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/google/callback`

  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth is not configured" },
      { status: 500 }
    )
  }

  const state = randomBytes(32).toString("hex")
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  })

  const url = `${GOOGLE_AUTH_URL}?${params.toString()}`

  const response = NextResponse.redirect(url)
  // Store state in cookie for CSRF verification (expires in 10 min)
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  })
  return response
}
