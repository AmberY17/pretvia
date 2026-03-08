import { describe, it, expect } from "vitest"
import { normalizeGroupTrainingSchedule } from "@/lib/group-training-schedule"

describe("normalizeGroupTrainingSchedule", () => {
  it("normalizes valid slots", () => {
    const result = normalizeGroupTrainingSchedule([
      { dayOfWeek: 1, time: "9:30" },
      { dayOfWeek: 5, time: "14:00" },
    ])
    expect(result).toEqual([
      { dayOfWeek: 1, time: "09:30" },
      { dayOfWeek: 5, time: "14:00" },
    ])
  })

  it("returns empty array for non-array input", () => {
    expect(normalizeGroupTrainingSchedule(null)).toEqual([])
    expect(normalizeGroupTrainingSchedule(undefined)).toEqual([])
    expect(normalizeGroupTrainingSchedule("invalid")).toEqual([])
  })

  it("clamps dayOfWeek to 0-6", () => {
    const result = normalizeGroupTrainingSchedule([
      { dayOfWeek: -1, time: "10:00" },
      { dayOfWeek: 7, time: "10:00" },
    ])
    expect(result[0].dayOfWeek).toBe(0)
    expect(result[1].dayOfWeek).toBe(6)
  })

  it("pads single-digit hours", () => {
    const result = normalizeGroupTrainingSchedule([
      { dayOfWeek: 0, time: "9:00" },
    ])
    expect(result[0].time).toBe("09:00")
  })

  it("defaults to 09:00 for malformed time", () => {
    const result = normalizeGroupTrainingSchedule([
      { dayOfWeek: 0, time: "invalid" },
    ])
    expect(result[0].time).toBe("09:00")
  })
})
