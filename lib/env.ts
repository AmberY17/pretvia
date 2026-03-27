const REQUIRED_SERVER_VARS = [
  "MONGODB_URI",
  "AUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const

let validated = false

export function validateEnv(): void {
  if (validated) return
  validated = true

  const missing = REQUIRED_SERVER_VARS.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Check your .env.local file or deployment environment settings."
    )
  }
}
