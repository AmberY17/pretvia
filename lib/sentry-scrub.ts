import type { ErrorEvent, EventHint } from "@sentry/nextjs"

/**
 * Defence-in-depth scrubber for Sentry events.
 *
 * `sendDefaultPii` is off, which should already keep cookies/IPs out of events,
 * but the `session` cookie is a bearer credential — a future config change or an
 * integration that attaches request data must not be able to leak it. Strip the
 * sensitive request fields unconditionally before the event leaves the process.
 */
export function scrubSentryEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent {
  if (event.request) {
    delete event.request.cookies
    if (event.request.headers) {
      for (const key of Object.keys(event.request.headers)) {
        const name = key.toLowerCase()
        if (name === "cookie" || name === "authorization" || name === "x-forwarded-for") {
          delete event.request.headers[key]
        }
      }
    }
  }

  if (event.user) {
    delete event.user.ip_address
  }

  return event
}
