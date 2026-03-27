import { NextResponse } from "next/server"
import { Webhook } from "svix"
import { Resend } from "resend"

const INBOUND_FROM = "support@mail.pretvia.com"

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET is not set")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set")
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
  }

  const forwardTo = process.env.INBOUND_FORWARD_TO
  if (!forwardTo) {
    console.error("INBOUND_FORWARD_TO is not set")
    return NextResponse.json({ error: "Forward address not configured" }, { status: 500 })
  }

  // Verify webhook signature (Resend uses Svix)
  const rawBody = await req.text()
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  }

  let event: { type: string; data: { email_id: string } }
  try {
    const wh = new Webhook(secret)
    event = wh.verify(rawBody, headers) as typeof event
  } catch (err) {
    console.error("Inbound webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  if (event.type !== "email.received") {
    return NextResponse.json({})
  }

  const emailId = event.data?.email_id
  if (!emailId) {
    console.error("Inbound webhook missing email_id")
    return NextResponse.json({})
  }

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.receiving.forward({
      emailId,
      to: [forwardTo],
      from: INBOUND_FROM,
    })
    if (error) {
      console.error("Failed to forward inbound email:", error)
    }
  } catch (err) {
    console.error("Error forwarding inbound email:", err)
  }

  return NextResponse.json({})
}
