import type { Event } from "@sentry/nextjs"

/** Drop credentials from events sent to Sentry: the `session` cookie is a live login token. */
export function scrubRequest<T extends Event>(event: T): T {
  if (event.request) {
    delete event.request.cookies
    if (event.request.headers) {
      delete event.request.headers.cookie
      delete event.request.headers.authorization
    }
  }
  return event
}
