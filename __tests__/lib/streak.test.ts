import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock mongodb module before importing streak
vi.mock("mongodb", () => ({
  ObjectId: vi.fn((id: string) => id),
}))

describe("streak calculation helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-08T12:00:00Z")) // Sunday
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("computeStreak returns 0 with no training slots", async () => {
    const { computeStreak } = await import("@/lib/streak")

    const mockDb = {
      collection: vi.fn(() => ({
        countDocuments: vi.fn().mockResolvedValue(5),
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            sort: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
            })),
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    }

    const result = await computeStreak(mockDb as any, "user1", [])
    expect(result.streak).toBe(0)
    expect(result.totalLogs).toBe(5)
  })

  it("computeStreak counts consecutive days with logs", async () => {
    const { computeStreak } = await import("@/lib/streak")

    // Training on Mondays at 10:00 and Wednesdays at 10:00
    const trainingSlots = [
      { dayOfWeek: 1, time: "10:00" }, // Monday
      { dayOfWeek: 3, time: "10:00" }, // Wednesday
    ]

    // Logs for Wed Mar 4 and Mon Mar 2
    const prefetchedLogs = [
      { timestamp: new Date("2026-03-02T10:30:00Z") }, // Mon
      { timestamp: new Date("2026-03-04T10:30:00Z") }, // Wed
    ]

    const mockDb = {
      collection: vi.fn(() => ({
        countDocuments: vi.fn().mockResolvedValue(2),
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            sort: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue(prefetchedLogs),
            })),
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    }

    const result = await computeStreak(
      mockDb as any,
      "user1",
      trainingSlots,
      "2026-03-08",
      prefetchedLogs,
      []
    )
    expect(result.streak).toBe(2) // Wed + Mon consecutive
  })

  it("computeTodaySkipStatus returns no_training when no slots today", async () => {
    const { computeTodaySkipStatus } = await import("@/lib/streak")

    const mockDb = {
      collection: vi.fn(() => ({
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    }

    // Today is Sunday (0), no training on Sundays
    const result = await computeTodaySkipStatus(
      mockDb as any,
      "user1",
      [{ dayOfWeek: 1, time: "10:00" }], // Only Monday
      "2026-03-08"
    )
    expect(result.canSkipToday).toBe(false)
    expect(result.skipDisabledReason).toBe("no_training")
  })
})
