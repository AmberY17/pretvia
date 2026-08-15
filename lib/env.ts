const REQUIRED_SERVER_VARS = [
  "MONGODB_URI",
  "AUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const

// Only enforced in production — local/dev setups often don't configure email
// sending, and requiring it there would break `pnpm dev` for no benefit.
const REQUIRED_PRODUCTION_VARS = [
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
] as const

let validated = false

export function validateEnv(): void {
  if (validated) return
  validated = true

  const requiredVars: readonly string[] =
    process.env.NODE_ENV === "production"
      ? [...REQUIRED_SERVER_VARS, ...REQUIRED_PRODUCTION_VARS]
      : REQUIRED_SERVER_VARS

  const missing = requiredVars.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Check your .env.local file or deployment environment settings."
    )
  }
}
