import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

function getSecret() {
  const authSecret = process.env.AUTH_SECRET
  if (!authSecret) {
    throw new Error("AUTH_SECRET is required. Add it to .env.local and restart the dev server.")
  }
  return new TextEncoder().encode(authSecret)
}

export interface SessionPayload {
  userId: string
  email: string
  displayName?: string
  role?: string
  groupId?: string
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(getSecret())

  const cookieStore = await cookies()
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })

  return token
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
}
