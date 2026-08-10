// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

import { scrubSentryEvent } from "@/lib/sentry-scrub"

Sentry.init({
  dsn: "https://0679c92158ec81142d87056e84ab529c@o4511137016971264.ingest.us.sentry.io/4511137017233408",

  // Sample a fraction of traces — 100% is needless cost for the traffic we see.
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Never send PII. This platform has under-13 users, and with PII enabled Sentry
  // attaches request cookies — including the `session` JWT — to captured errors.
  sendDefaultPii: false,

  beforeSend: scrubSentryEvent,
})
