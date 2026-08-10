import { NextResponse } from "next/server"
import { createAdminSession, verifyAdminPassword } from "@/lib/admin-auth"
import { adminAuthRateLimiter, getIp } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    if (adminAuthRateLimiter) {
      const { success } = await adminAuthRateLimiter.limit(getIp(req))
      if (!success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 })
      }
    }

    if (!process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: "Admin not configured" }, { status: 500 })
    }

    const { secret } = await req.json()
    if (!verifyAdminPassword(secret)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    await createAdminSession()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("POST /api/admin/auth:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
