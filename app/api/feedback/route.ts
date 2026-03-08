import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sendFeedbackEmail } from "@/lib/resend"

const MAX_MESSAGE_LENGTH = 2000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const page = typeof body.page === "string" ? body.page.trim().slice(0, 500) : undefined

    if (!message) {
      return NextResponse.json({ error: "Feedback message is required" }, { status: 400 })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` }, { status: 400 })
    }

    const session = await getSession()
    const metadata: { email?: string; displayName?: string; page?: string } = { page: page || undefined }
    if (session?.email) metadata.email = session.email
    if (session?.displayName) metadata.displayName = session.displayName

    const result = await sendFeedbackEmail(message, metadata)
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed to send feedback" }, { status: 500 })
    }

    return NextResponse.json({ message: "Feedback sent" })
  } catch (err) {
    console.error("POST /api/feedback:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
