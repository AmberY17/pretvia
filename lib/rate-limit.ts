import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import * as Sentry from "@sentry/nextjs"

let warnedMissingUpstash = false

function createRateLimiter(
  requests: number,
  window: `${number} s` | `${number} m` | `${number} h`
): Ratelimit | null {
  // Disable rate limiting outside production to avoid dev/local blocking.
  if (process.env.NODE_ENV !== "production") {
    return null
  }
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    if (!warnedMissingUpstash) {
      warnedMissingUpstash = true
      console.error(
        "Rate limiting disabled in production: missing UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN"
      )
      Sentry.captureMessage(
        "Rate limiting disabled in production: missing Upstash env vars",
        "warning"
      )
    }
    return null
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: "pretvia:rl",
  })
}

// 5 login attempts per minute per IP
export const loginRateLimiter = createRateLimiter(5, "1 m")

// 3 signup attempts per minute per IP
export const signupRateLimiter = createRateLimiter(3, "1 m")

// 2 password reset requests per minute per IP
export const passwordResetRateLimiter = createRateLimiter(2, "1 m")

// 60 requests per minute per IP for hot read/write paths
export const apiRateLimiter = createRateLimiter(60, "1 m")

// 5 admin password attempts per minute per IP — the admin gate is a single
// shared secret, so it needs at least as much protection as user login.
export const adminAuthRateLimiter = createRateLimiter(5, "1 m")

// 3 waitlist submissions per minute per IP. Unauthenticated and public, so it
// was the one write endpoint anyone on the internet could hit without a limit.
export const waitlistRateLimiter = createRateLimiter(3, "1 m")

export function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous"
  )
}
