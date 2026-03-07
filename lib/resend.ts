import { Resend } from "resend"

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const FROM_DISPLAY = `Pretvia <${FROM_EMAIL}>`

/** For testing: redirect emails to test recipients to a single address */
function resolveRecipient(to: string): string {
  const redirect = process.env.TEST_EMAIL_REDIRECT
  if (!redirect) return to
  const testEmails = (process.env.TEST_ACCOUNT_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (testEmails.includes(to.toLowerCase())) return redirect
  return to
}

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
    to: resolveRecipient(to),
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
    to: resolveRecipient(to),
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

const FEEDBACK_EMAIL =
  process.env.FEEDBACK_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"

export async function sendFeedbackEmail(
  message: string,
  metadata?: { email?: string; displayName?: string; page?: string }
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set")
    return { ok: false, error: "Email service is not configured" }
  }

  const resend = new Resend(apiKey)
  const fromLabel = metadata?.displayName ?? metadata?.email ?? "Anonymous"
  const subject = `Pretvia Feedback from ${fromLabel}`

  const lines: string[] = [
    `<p style="margin: 0 0 16px; font-size: 16px; color: #18181b; white-space: pre-wrap;">${escapeHtml(message)}</p>`,
  ]
  if (metadata?.email) {
    lines.push(`<p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">From: ${escapeHtml(metadata.email)}</p>`)
  }
  if (metadata?.displayName && !metadata?.email) {
    lines.push(`<p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">From: ${escapeHtml(metadata.displayName)} (anonymous)</p>`)
  }
  if (metadata?.page) {
    lines.push(`<p style="margin: 0; font-size: 14px; color: #a1a1aa;">Page: ${escapeHtml(metadata.page)}</p>`)
  }

  const { error } = await resend.emails.send({
    from: FROM_DISPLAY,
    to: FEEDBACK_EMAIL,
    replyTo: metadata?.email ?? undefined,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #18181b;">Pretvia Feedback</h2>
          ${lines.join("")}
        </body>
      </html>
    `,
  })

  if (error) {
    console.error("Resend feedback error:", error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

const emailWrapper = (content: string) => `
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
                  ${content}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`

export async function sendAthleteInviteEmail(
  to: string,
  inviteUrl: string,
  groupName: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set")
    return { ok: false, error: "Email service is not configured" }
  }

  const resend = new Resend(apiKey)
  const content = `
    <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #18181b;">Join ${escapeHtml(groupName)} on Pretvia</h1>
    <p style="margin: 0 0 24px; font-size: 16px; color: #71717a;">You've been invited to join this group. Click below to create your account and get started.</p>
    <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: #18181b;">
          <a href="${inviteUrl}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Accept invite</a>
        </td>
      </tr>
    </table>
    <p style="margin: 24px 0 0; font-size: 14px; color: #a1a1aa;">Or copy and paste this URL: ${inviteUrl}</p>
    <p style="margin: 32px 0 0; font-size: 13px; color: #a1a1aa;">This link expires in 7 days.</p>
  `
  const { error } = await resend.emails.send({
    from: FROM_DISPLAY,
    to: resolveRecipient(to),
    subject: `Join ${groupName} – Pretvia`,
    html: emailWrapper(content),
  })
  if (error) {
    console.error("Resend athlete invite error:", error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function sendUnder13ParentInviteEmail(
  to: string,
  inviteUrl: string,
  groupName: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set")
    return { ok: false, error: "Email service is not configured" }
  }

  const resend = new Resend(apiKey)
  const content = `
    <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #18181b;">Set up your child's account</h1>
    <p style="margin: 0 0 24px; font-size: 16px; color: #71717a;">Your child has been invited to join ${escapeHtml(groupName)} on Pretvia. As a parent, please set up their account using the link below.</p>
    <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: #18181b;">
          <a href="${inviteUrl}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Set up account</a>
        </td>
      </tr>
    </table>
    <p style="margin: 24px 0 0; font-size: 14px; color: #a1a1aa;">Or copy and paste this URL: ${inviteUrl}</p>
    <p style="margin: 32px 0 0; font-size: 13px; color: #a1a1aa;">This link expires in 7 days.</p>
  `
  const { error } = await resend.emails.send({
    from: FROM_DISPLAY,
    to: resolveRecipient(to),
    subject: `Set up your child's Pretvia account – ${groupName}`,
    html: emailWrapper(content),
  })
  if (error) {
    console.error("Resend under-13 invite error:", error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function sendUnder13ChildVerificationEmail(
  to: string,
  verifyUrl: string,
  groupName: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set")
    return { ok: false, error: "Email service is not configured" }
  }

  const resend = new Resend(apiKey)
  const content = `
    <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #18181b;">Verify your email for Pretvia</h1>
    <p style="margin: 0 0 24px; font-size: 16px; color: #71717a;">Your parent is setting up your account to join ${escapeHtml(groupName)} on Pretvia. Click the button below to verify this email address.</p>
    <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: #18181b;">
          <a href="${verifyUrl}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Verify my email</a>
        </td>
      </tr>
    </table>
    <p style="margin: 24px 0 0; font-size: 14px; color: #a1a1aa;">Or copy and paste this URL: ${verifyUrl}</p>
    <p style="margin: 32px 0 0; font-size: 13px; color: #a1a1aa;">This link expires in 24 hours. If you didn't expect this, you can ignore this email.</p>
  `
  const { error } = await resend.emails.send({
    from: FROM_DISPLAY,
    to: resolveRecipient(to),
    subject: `Verify your email – ${groupName} on Pretvia`,
    html: emailWrapper(content),
  })
  if (error) {
    console.error("Resend under-13 child verification error:", error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function sendParentInviteEmail(
  to: string,
  inviteUrl: string,
  groupName: string,
  athleteLabel: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set")
    return { ok: false, error: "Email service is not configured" }
  }

  const resend = new Resend(apiKey)
  const content = `
    <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #18181b;">View your ${escapeHtml(athleteLabel)}'s progress</h1>
    <p style="margin: 0 0 24px; font-size: 16px; color: #71717a;">You've been invited to view your ${athleteLabel.toLowerCase()}'s training logs in ${escapeHtml(groupName)} on Pretvia. Click below to create your parent account.</p>
    <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: #18181b;">
          <a href="${inviteUrl}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Create account</a>
        </td>
      </tr>
    </table>
    <p style="margin: 24px 0 0; font-size: 14px; color: #a1a1aa;">Or copy and paste this URL: ${inviteUrl}</p>
    <p style="margin: 32px 0 0; font-size: 13px; color: #a1a1aa;">This link expires in 7 days.</p>
  `
  const { error } = await resend.emails.send({
    from: FROM_DISPLAY,
    to: resolveRecipient(to),
    subject: `View ${athleteLabel}'s progress – Pretvia`,
    html: emailWrapper(content),
  })
  if (error) {
    console.error("Resend parent invite error:", error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
