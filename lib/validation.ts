import { z } from "zod"
import { NextResponse } from "next/server"

/**
 * Request-body validation schemas.
 *
 * The house style for a route handler is:
 *
 *   const parsed = logCreateSchema.safeParse(await req.json())
 *   if (!parsed.success) return validationError(parsed.error)
 *   const { emoji, notes } = parsed.data
 *
 * `validationError` keeps the documented `{ error: string }` response shape —
 * zod's own error object must never be returned verbatim, both because it breaks
 * that contract and because it echoes back the submitted values.
 */

/** Field limits, kept together so they are easy to compare across entities. */
export const LIMITS = {
  /** Matches the existing cap on comments; announcements use 500, feedback 2000. */
  notes: 1000,
  tagLength: 40,
  tagCount: 20,
  emoji: 40,
  displayName: 100,
  groupName: 60,
} as const

/** Turn a zod failure into the app's standard error response. */
export function validationError(error: z.ZodError): NextResponse {
  const first = error.issues[0]
  const path = first?.path.join(".")
  const message = first?.message ?? "Invalid request"
  return NextResponse.json(
    { error: path ? `${path}: ${message}` : message },
    { status: 400 },
  )
}

/**
 * A log is visible either to the athlete's coaches or to nobody but the athlete.
 * Previously any string was stored verbatim, so a value like "banana" hid the log
 * from coaches *and* slipped past the daily-limit check, which only recognised
 * the two real values.
 */
export const visibilitySchema = z.enum(["coach", "private"])

/**
 * Accepts an ISO string or epoch millis and rejects anything that would become an
 * `Invalid Date` once stored.
 */
export const timestampSchema = z
  .union([z.string(), z.number()])
  .transform((value) => new Date(value))
  .refine((date) => !Number.isNaN(date.getTime()), { message: "must be a valid date" })

const tagsSchema = z
  .array(z.string().trim().min(1).max(LIMITS.tagLength))
  .max(LIMITS.tagCount)
  // Duplicate tags would inflate the derived tag counts.
  .transform((tags) => [...new Set(tags)])

const notesSchema = z.string().max(LIMITS.notes)

export const logCreateSchema = z.object({
  emoji: z.string().trim().min(1, "An emoji is required").max(LIMITS.emoji),
  timestamp: timestampSchema.optional(),
  isGroup: z.boolean().optional(),
  visibility: visibilitySchema.optional(),
  notes: notesSchema.optional(),
  tags: tagsSchema.optional(),
  checkinId: z.string().optional(),
})

export type LogCreateInput = z.infer<typeof logCreateSchema>

/**
 * Update is a partial: an absent key means "leave unchanged", so every field is
 * optional and the handler must distinguish absent from empty.
 */
export const logUpdateSchema = z.object({
  emoji: z.string().trim().min(1).max(LIMITS.emoji).optional(),
  timestamp: timestampSchema.optional(),
  isGroup: z.boolean().optional(),
  visibility: visibilitySchema.optional(),
  notes: notesSchema.optional(),
  tags: tagsSchema.optional(),
})

export type LogUpdateInput = z.infer<typeof logUpdateSchema>

/**
 * Email as stored: lowercased *and* trimmed. Several auth routes lowercased
 * without trimming, so an address signed up with a trailing space could never be
 * matched at login.
 */
export const emailSchema = z
  .string({ message: "Email is required" })
  .trim()
  .toLowerCase()
  .min(3)
  .max(320)
  .email("Enter a valid email address")

/** Minimum enforced at signup and every invite-redemption path. */
export const passwordSchema = z
  .string({ message: "Password is required" })
  .min(6, "Password must be at least 6 characters")
  .max(200)

/**
 * Waitlist submission. This endpoint is public and unauthenticated, and the
 * `groups` object was previously persisted almost verbatim — only
 * `groups[0].ageGroups` was looked at — so an arbitrary nested payload could be
 * stored against a waitlist row.
 */
export const waitlistSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(LIMITS.displayName),
  lastName: z.string().trim().min(1, "Last name is required").max(LIMITS.displayName),
  email: emailSchema,
  clubName: z.string().trim().min(1, "Club name is required").max(LIMITS.groupName),
  groups: z
    .array(
      z.object({
        name: z.string().trim().max(LIMITS.groupName).optional(),
        ageGroups: z.array(z.string().trim().min(1).max(40)).min(1, "Select at least one age group").max(20),
      }),
    )
    .min(1, "At least one group is required")
    .max(20),
})

export const attendanceStatusSchema = z.enum(["present", "absent", "excused"])

/**
 * Attendance entries. Capped because the array is stored as a single document,
 * and every userId is checked against group membership by the route — the schema
 * only guarantees shape.
 */
export const attendanceEntriesSchema = z
  .array(
    z.object({
      userId: z.string().min(1),
      status: attendanceStatusSchema,
    }),
  )
  .max(500)
