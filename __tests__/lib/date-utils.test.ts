import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { formatAgeAndBirthday, getDateFilterParams } from "@/lib/date-utils"

describe("formatAgeAndBirthday", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-08T12:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns null for undefined/null input", () => {
    expect(formatAgeAndBirthday(undefined)).toBeNull()
    expect(formatAgeAndBirthday(null)).toBeNull()
  })

  it("returns null for invalid date string", () => {
    expect(formatAgeAndBirthday("not-a-date")).toBeNull()
  })

  it("calculates age and formats birthday", () => {
    const result = formatAgeAndBirthday("2000-06-15T00:00:00")
    expect(result).toBe("Age: 25 · Jun 15")
  })

  it("handles birthday not yet passed this year", () => {
    const result = formatAgeAndBirthday("2000-12-25T00:00:00")
    expect(result).toBe("Age: 25 · Dec 25")
  })

  it("handles birthday already passed this year", () => {
    const result = formatAgeAndBirthday("2000-01-01T00:00:00")
    expect(result).toBe("Age: 26 · Jan 1")
  })
})

describe("getDateFilterParams", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-08T12:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns empty for 'all' filter", () => {
    expect(getDateFilterParams("all", null)).toEqual({})
  })

  it("returns today range for 'today' filter", () => {
    const result = getDateFilterParams("today", null)
    expect(result.dateFrom).toBeDefined()
    expect(result.dateTo).toBeDefined()
  })

  it("returns 7 day range", () => {
    const result = getDateFilterParams("7d", null)
    expect(result.dateFrom).toBeDefined()
    expect(result.dateTo).toBeDefined()
  })

  it("returns 30 day range", () => {
    const result = getDateFilterParams("30d", null)
    expect(result.dateFrom).toBeDefined()
    expect(result.dateTo).toBeDefined()
  })

  it("returns dates string for custom filter with dates", () => {
    const result = getDateFilterParams("custom", ["2026-03-01", "2026-03-05"])
    expect(result).toEqual({ dates: "2026-03-01,2026-03-05" })
  })

  it("returns empty for custom filter with no dates", () => {
    expect(getDateFilterParams("custom", null)).toEqual({})
    expect(getDateFilterParams("custom", [])).toEqual({})
  })
})
