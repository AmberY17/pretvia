import { Resend } from "resend"

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function sendVerificationEmail(
  to: string,
  token: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set")
    return { ok: false, error: "Email service is not configured" }
  }

  const resend = new Resend(apiKey)
  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Verify your email – Pretvia",
    html: `
      <p>Thanks for signing up! Click the link below to verify your email and get started.</p>
      <p><a href="${verifyUrl}" style="color: #0070f3;">Verify my email</a></p>
      <p>Or copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
      <p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
    `,
  })

  if (error) {
    console.error("Resend error:", error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
