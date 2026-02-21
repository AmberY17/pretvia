/**
 * Test account emails (comma-separated) that skip email verification.
 * Used for demo accounts.
 */
const TEST_EMAILS_RAW = process.env.TEST_ACCOUNT_EMAILS ?? ""

const TEST_EMAILS = new Set(
  TEST_EMAILS_RAW.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
)

export function isTestAccount(email: string): boolean {
  if (!email) return false
  return TEST_EMAILS.has(email.trim().toLowerCase())
}
