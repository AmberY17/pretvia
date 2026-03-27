import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

function createRateLimiter(
  requests: number,
  window: `${number} s` | `${number} m` | `${number} h`
): Ratelimit | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
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

export function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous"
  )
}
