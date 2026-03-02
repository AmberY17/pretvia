import { Resend } from "resend"

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const FROM_DISPLAY = `Pretvia <${FROM_EMAIL}>`

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
    from: FROM_DISPLAY,
    to,
    subject: "Verify your email – Pretvia",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; line-height: 1.6;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">
                  <tr>
                    <td style="padding: 40px 32px; text-align: center;">
                      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #18181b;">Welcome to Pretvia</h1>
                      <p style="margin: 0 0 24px; font-size: 16px; color: #71717a;">Thanks for signing up! Click the button below to verify your email and get started.</p>
                      <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                        <tr>
                          <td align="center" style="border-radius: 8px; background-color: #18181b;">
                            <a href="${verifyUrl}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Verify my email</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 24px 0 0; font-size: 14px; color: #a1a1aa;">Or copy and paste this URL into your browser:</p>
                      <p style="margin: 8px 0 0; font-size: 12px; word-break: break-all; color: #71717a;">${verifyUrl}</p>
                      <p style="margin: 32px 0 0; font-size: 13px; color: #a1a1aa;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  })

  if (error) {
    console.error("Resend error:", error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set")
    return { ok: false, error: "Email service is not configured" }
  }

  const resend = new Resend(apiKey)
  const resetUrl = `${APP_URL}/auth/reset-password?token=${encodeURIComponent(token)}`

  const { error } = await resend.emails.send({
    from: FROM_DISPLAY,
    to,
    subject: "Reset your password – Pretvia",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; line-height: 1.6;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">
                  <tr>
                    <td style="padding: 40px 32px; text-align: center;">
                      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #18181b;">Reset your password</h1>
                      <p style="margin: 0 0 24px; font-size: 16px; color: #71717a;">Click the button below to set a new password for your Pretvia account.</p>
                      <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                        <tr>
                          <td align="center" style="border-radius: 8px; background-color: #18181b;">
                            <a href="${resetUrl}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Reset password</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 24px 0 0; font-size: 14px; color: #a1a1aa;">Or copy and paste this URL into your browser:</p>
                      <p style="margin: 8px 0 0; font-size: 12px; word-break: break-all; color: #71717a;">${resetUrl}</p>
                      <p style="margin: 32px 0 0; font-size: 13px; color: #a1a1aa;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  })

  if (error) {
    console.error("Resend error:", error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
