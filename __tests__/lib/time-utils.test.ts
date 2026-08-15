import { describe, it, expect } from "vitest"
import { parseTime } from "@/lib/time-utils"

describe("parseTime", () => {
  it("parses HH:mm format", () => {
    expect(parseTime("09:30")).toEqual({ hours: 9, minutes: 30 })
  })

  it("parses midnight", () => {
    expect(parseTime("00:00")).toEqual({ hours: 0, minutes: 0 })
  })

  it("parses end of day", () => {
    expect(parseTime("23:59")).toEqual({ hours: 23, minutes: 59 })
  })

  it("handles leading/trailing whitespace", () => {
    expect(parseTime("  14:05  ")).toEqual({ hours: 14, minutes: 5 })
  })

  it("falls back to 0 for malformed input instead of NaN", () => {
    const result = parseTime("invalid")
    expect(result.hours).toBe(0)
    expect(result.minutes).toBe(0)
  })

  it("falls back to 0 for a non-numeric hour with a valid-looking minute", () => {
    expect(parseTime("ab:30")).toEqual({ hours: 0, minutes: 30 })
  })
})
