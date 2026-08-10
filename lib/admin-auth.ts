import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { timingSafeEqual } from "crypto"

/**
 * Admin session handling.
 *
 * The `admin_session` cookie holds a short-lived signed token, NOT `ADMIN_SECRET`
 * itself. Storing the raw secret made the cookie a copy of the credential (so it
 * could never be revoked or rotated independently) and invited non-constant-time
 * `===` comparisons — this module is the single place either value is checked.
 */

const ADMIN_COOKIE = "admin_session"
const SESSION_SECONDS = 60 * 60 * 8 // 8 hours

function getAdminSecret(): string | null {
  return process.env.ADMIN_SECRET || null
}

function getSigningKey(secret: string) {
  return new TextEncoder().encode(secret)
}

/** Constant-time check of a submitted admin password against `ADMIN_SECRET`. */
export function verifyAdminPassword(provided: unknown): boolean {
  const adminSecret = getAdminSecret()
  if (!adminSecret || typeof provided !== "string") return false

  const a = Buffer.from(provided)
  const b = Buffer.from(adminSecret)
  // timingSafeEqual throws on length mismatch — compare lengths separately so a
  // wrong-length guess isn't distinguishable by an exception path.
  if (a.length !== b.length) {
    timingSafeEqual(b, b)
    return false
  }
  return timingSafeEqual(a, b)
}

/** Issue the admin session cookie. Caller must already have verified the password. */
export async function createAdminSession(): Promise<void> {
  const adminSecret = getAdminSecret()
  if (!adminSecret) throw new Error("ADMIN_SECRET is not configured")

  const token = await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .setIssuedAt()
    .sign(getSigningKey(adminSecret))

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_SECONDS,
    path: "/",
  })
}

/**
 * The single admin gate. Used by every admin API route and by the admin page
 * layout — do not reimplement this check inline.
 */
export async function verifyAdminSession(): Promise<boolean> {
  const adminSecret = getAdminSecret()
  if (!adminSecret) return false

  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  if (!token) return false

  try {
    const { payload } = await jwtVerify(token, getSigningKey(adminSecret))
    return payload.admin === true
  } catch {
    return false
  }
}

export async function deleteAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
}
