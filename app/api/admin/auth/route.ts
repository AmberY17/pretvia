import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret) {
      return NextResponse.json({ error: "Admin not configured" }, { status: 500 })
    }

    const { secret } = await req.json()
    if (secret !== adminSecret) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    const cookieStore = await cookies()
    cookieStore.set("admin_session", adminSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("POST /api/admin/auth:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
