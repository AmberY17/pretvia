// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"
import { scrubRequest } from "@/lib/sentry-scrub"

Sentry.init({
  dsn: "https://0679c92158ec81142d87056e84ab529c@o4511137016971264.ingest.us.sentry.io/4511137017233408",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Don't send user PII (IPs, cookies, headers) — the app has under-13 users and the
  // `session` cookie is a login credential.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,
  beforeSend: scrubRequest,
  beforeSendTransaction: scrubRequest,
})
