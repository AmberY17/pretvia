import { describe, it, expect } from "vitest"
import {
  LIMITS,
  logCreateSchema,
  logUpdateSchema,
  emailSchema,
  passwordSchema,
  visibilitySchema,
  timestampSchema,
  attendanceEntriesSchema,
  validationError,
} from "@/lib/validation"

describe("visibilitySchema", () => {
  it("accepts only the two real values", () => {
    expect(visibilitySchema.safeParse("coach").success).toBe(true)
    expect(visibilitySchema.safeParse("private").success).toBe(true)
  })

  it("rejects an arbitrary string", () => {
    // "banana" used to be stored verbatim, which hid the log from coaches and
    // slipped past the daily-limit check because that only knew the two real values.
    expect(visibilitySchema.safeParse("banana").success).toBe(false)
  })
})

describe("timestampSchema", () => {
  it("accepts an ISO string", () => {
    const parsed = timestampSchema.safeParse("2026-08-10T12:00:00.000Z")
    expect(parsed.success && parsed.data instanceof Date).toBe(true)
  })

  it("accepts epoch millis", () => {
    const parsed = timestampSchema.safeParse(1_754_827_200_000)
    expect(parsed.success && parsed.data instanceof Date).toBe(true)
  })

  it("rejects a value that would be stored as Invalid Date", () => {
    expect(timestampSchema.safeParse("not-a-date").success).toBe(false)
  })
})

describe("logCreateSchema", () => {
  it("requires an emoji", () => {
    expect(logCreateSchema.safeParse({}).success).toBe(false)
    expect(logCreateSchema.safeParse({ emoji: "   " }).success).toBe(false)
  })

  it("accepts a minimal log", () => {
    const parsed = logCreateSchema.safeParse({ emoji: "💪" })
    expect(parsed.success).toBe(true)
  })

  it("caps notes length", () => {
    expect(
      logCreateSchema.safeParse({ emoji: "💪", notes: "x".repeat(LIMITS.notes) }).success,
    ).toBe(true)
    expect(
      logCreateSchema.safeParse({ emoji: "💪", notes: "x".repeat(LIMITS.notes + 1) }).success,
    ).toBe(false)
  })

  it("bounds the tag array and rejects non-string elements", () => {
    expect(
      logCreateSchema.safeParse({ emoji: "💪", tags: Array(LIMITS.tagCount + 1).fill("a") })
        .success,
    ).toBe(false)
    expect(logCreateSchema.safeParse({ emoji: "💪", tags: [1, 2] }).success).toBe(false)
    expect(logCreateSchema.safeParse({ emoji: "💪", tags: [""] }).success).toBe(false)
  })

  it("deduplicates tags so derived tag counts are not inflated", () => {
    const parsed = logCreateSchema.safeParse({ emoji: "💪", tags: ["legs", "legs", "core"] })
    expect(parsed.success && parsed.data.tags).toEqual(["legs", "core"])
  })

  it("trims tags", () => {
    const parsed = logCreateSchema.safeParse({ emoji: "💪", tags: ["  legs  "] })
    expect(parsed.success && parsed.data.tags).toEqual(["legs"])
  })

  it("rejects an unrecognized visibility", () => {
    expect(logCreateSchema.safeParse({ emoji: "💪", visibility: "banana" }).success).toBe(false)
  })

  it("rejects an unparseable timestamp instead of storing Invalid Date", () => {
    expect(logCreateSchema.safeParse({ emoji: "💪", timestamp: "yesterday" }).success).toBe(false)
  })
})

describe("logUpdateSchema", () => {
  it("treats every field as optional so an absent key means unchanged", () => {
    const parsed = logUpdateSchema.safeParse({})
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.emoji).toBeUndefined()
  })

  it("still validates the fields that are present", () => {
    expect(logUpdateSchema.safeParse({ visibility: "banana" }).success).toBe(false)
    expect(logUpdateSchema.safeParse({ notes: "x".repeat(LIMITS.notes + 1) }).success).toBe(false)
  })

  it("ignores unknown keys such as the id the route reads separately", () => {
    const parsed = logUpdateSchema.safeParse({ id: "abc", emoji: "💪" })
    expect(parsed.success).toBe(true)
    expect(parsed.success && "id" in parsed.data).toBe(false)
  })
})

describe("emailSchema", () => {
  it("lowercases and trims — a trailing space must not create an unmatchable account", () => {
    const parsed = emailSchema.safeParse("  Coach@Example.COM ")
    expect(parsed.success && parsed.data).toBe("coach@example.com")
  })

  it("rejects a non-string rather than throwing on .toLowerCase()", () => {
    expect(emailSchema.safeParse(123).success).toBe(false)
    expect(emailSchema.safeParse(null).success).toBe(false)
    expect(emailSchema.safeParse({}).success).toBe(false)
  })

  it("rejects a malformed address", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false)
  })
})

describe("passwordSchema", () => {
  it("enforces the six character minimum", () => {
    expect(passwordSchema.safeParse("12345").success).toBe(false)
    expect(passwordSchema.safeParse("123456").success).toBe(true)
  })

  it("rejects a non-string", () => {
    expect(passwordSchema.safeParse(123456).success).toBe(false)
  })
})

describe("attendanceEntriesSchema", () => {
  it("accepts well-formed entries", () => {
    const parsed = attendanceEntriesSchema.safeParse([{ userId: "u1", status: "present" }])
    expect(parsed.success).toBe(true)
  })

  it("rejects an unknown status", () => {
    expect(
      attendanceEntriesSchema.safeParse([{ userId: "u1", status: "maybe" }]).success,
    ).toBe(false)
  })

  it("bounds the array so one request cannot store an unbounded document", () => {
    const huge = Array(501).fill({ userId: "u1", status: "present" })
    expect(attendanceEntriesSchema.safeParse(huge).success).toBe(false)
  })
})

describe("validationError", () => {
  it("returns the documented { error: string } shape with a 400", async () => {
    const parsed = logCreateSchema.safeParse({ emoji: "" })
    if (parsed.success) throw new Error("expected a failure")

    const res = validationError(parsed.error)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(typeof body.error).toBe("string")
    expect(Object.keys(body)).toEqual(["error"])
  })

  it("does not echo the submitted value back to the client", async () => {
    const parsed = logCreateSchema.safeParse({ emoji: "💪", notes: "SECRET".repeat(500) })
    if (parsed.success) throw new Error("expected a failure")

    const body = await validationError(parsed.error).json()
    expect(body.error).not.toContain("SECRET")
  })
})
