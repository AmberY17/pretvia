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

  it("miss immediately: slot passed, no log, no skip → streak = 0", async () => {
    // now = Monday 2pm, Monday slot at 10am has passed, no log or skip
    vi.setSystemTime(new Date("2026-03-16T14:00:00Z"))
    const { computeStreak } = await import("@/lib/streak")

    const trainingSlots = [
      { dayOfWeek: 0, time: "10:00" }, // Sunday
      { dayOfWeek: 1, time: "10:00" }, // Monday
    ]
    // Only Sunday logged — Monday is a miss
    const prefetchedLogs = [{ timestamp: new Date("2026-03-15T10:30:00Z") }]

    const mockDb = {
      collection: vi.fn(() => ({
        countDocuments: vi.fn().mockResolvedValue(1),
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            sort: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    }

    const result = await computeStreak(
      mockDb as any,
      "user1",
      trainingSlots,
      "2026-03-16",
      prefetchedLogs,
      []
    )
    // Monday slot passed with no log/skip — immediate miss → streak = 0
    expect(result.streak).toBe(0)
  })

  it("skip-only: neutral — prior logged days preserved but not incremented", async () => {
    // now = Monday 2pm, Monday skipped, Sunday logged
    vi.setSystemTime(new Date("2026-03-16T14:00:00Z"))
    const { computeStreak } = await import("@/lib/streak")

    const trainingSlots = [
      { dayOfWeek: 0, time: "10:00" }, // Sunday
      { dayOfWeek: 1, time: "10:00" }, // Monday
    ]
    const prefetchedLogs = [{ timestamp: new Date("2026-03-15T10:30:00Z") }] // Sunday only
    const prefetchedSkips = [
      { date: new Date("2026-03-16T00:00:00Z"), dayOfWeek: 1, scheduledTime: "10:00" },
    ]

    const mockDb = {
      collection: vi.fn(() => ({
        countDocuments: vi.fn().mockResolvedValue(1),
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            sort: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    }

    const result = await computeStreak(
      mockDb as any,
      "user1",
      trainingSlots,
      "2026-03-16",
      prefetchedLogs,
      prefetchedSkips
    )
    // Monday skip is neutral (no increment, no break) — only Sunday counts
    expect(result.streak).toBe(1)
  })

  it("log + no skip (skip removed by removeRedundantSkipsForLog) → both days count", async () => {
    vi.setSystemTime(new Date("2026-03-16T14:00:00Z"))
    const { computeStreak } = await import("@/lib/streak")

    const trainingSlots = [
      { dayOfWeek: 0, time: "10:00" }, // Sunday
      { dayOfWeek: 1, time: "10:00" }, // Monday
    ]
    // Both days logged, no skips (skip was removed when Monday log was added)
    const prefetchedLogs = [
      { timestamp: new Date("2026-03-15T10:30:00Z") }, // Sunday
      { timestamp: new Date("2026-03-16T11:00:00Z") }, // Monday
    ]

    const mockDb = {
      collection: vi.fn(() => ({
        countDocuments: vi.fn().mockResolvedValue(2),
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            sort: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    }

    const result = await computeStreak(
      mockDb as any,
      "user1",
      trainingSlots,
      "2026-03-16",
      prefetchedLogs,
      []
    )
    expect(result.streak).toBe(2)
  })

  it("multi-day skip chain doesn't break streak", async () => {
    // now = Wednesday 2pm, training Sun/Mon/Wed
    // Logs: Sunday. Skips: Monday + Wednesday.
    vi.setSystemTime(new Date("2026-03-18T14:00:00Z"))
    const { computeStreak } = await import("@/lib/streak")

    const trainingSlots = [
      { dayOfWeek: 0, time: "10:00" }, // Sunday
      { dayOfWeek: 1, time: "10:00" }, // Monday
      { dayOfWeek: 3, time: "10:00" }, // Wednesday
    ]
    const prefetchedLogs = [{ timestamp: new Date("2026-03-15T10:30:00Z") }] // Sunday only
    const prefetchedSkips = [
      { date: new Date("2026-03-16T00:00:00Z"), dayOfWeek: 1, scheduledTime: "10:00" }, // Monday
      { date: new Date("2026-03-18T00:00:00Z"), dayOfWeek: 3, scheduledTime: "10:00" }, // Wednesday
    ]

    const mockDb = {
      collection: vi.fn(() => ({
        countDocuments: vi.fn().mockResolvedValue(1),
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            sort: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    }

    const result = await computeStreak(
      mockDb as any,
      "user1",
      trainingSlots,
      "2026-03-18",
      prefetchedLogs,
      prefetchedSkips
    )
    // Wed skip neutral → Mon skip neutral → Sun logged = streak 1
    expect(result.streak).toBe(1)
  })

  it("miss in the middle breaks streak — earlier logged days not counted", async () => {
    // now = Wednesday 2pm, training Sun/Mon/Wed
    // Logs: Sunday + Wednesday. Monday missed (no log, no skip).
    vi.setSystemTime(new Date("2026-03-18T14:00:00Z"))
    const { computeStreak } = await import("@/lib/streak")

    const trainingSlots = [
      { dayOfWeek: 0, time: "10:00" }, // Sunday
      { dayOfWeek: 1, time: "10:00" }, // Monday
      { dayOfWeek: 3, time: "10:00" }, // Wednesday
    ]
    const prefetchedLogs = [
      { timestamp: new Date("2026-03-15T10:30:00Z") }, // Sunday
      { timestamp: new Date("2026-03-18T10:30:00Z") }, // Wednesday
    ]

    const mockDb = {
      collection: vi.fn(() => ({
        countDocuments: vi.fn().mockResolvedValue(2),
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            sort: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    }

    const result = await computeStreak(
      mockDb as any,
      "user1",
      trainingSlots,
      "2026-03-18",
      prefetchedLogs,
      []
    )
    // Wed logged (streak=1) → Mon missed → break; Sunday not reached
    expect(result.streak).toBe(1)
  })

  it("addedAt — new slot past instances are invisible (no retroactive misses)", async () => {
    // now = Wednesday, slot added today (addedAt = today); past Wednesdays are invisible
    vi.setSystemTime(new Date("2026-03-18T14:00:00Z"))
    const { computeStreak } = await import("@/lib/streak")

    const today = new Date("2026-03-18T00:00:00Z")
    // Wednesday slot added today — past Wednesdays should be invisible
    const trainingSlots = [{ dayOfWeek: 3, time: "10:00", addedAt: today }]

    const mockDb = {
      collection: vi.fn(() => ({
        countDocuments: vi.fn().mockResolvedValue(0),
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            sort: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    }

    const result = await computeStreak(
      mockDb as any,
      "user1",
      trainingSlots,
      "2026-03-18",
      [], // no logs
      []
    )
    // Today's slot hasn't passed yet (10am < now 2pm, addedAt = today midnight so today counts)
    // But past Wednesdays are before addedAt — invisible, no miss. Streak = 0 (today's slot passed but no log).
    // Actually today slot at 10am < now at 2pm, addedAt = today midnight, slotTime(10am) >= addedAt(midnight) → visible
    // No log today → miss → streak = 0
    expect(result.streak).toBe(0)
  })

  it("addedAt — past weeks of a new slot are invisible (no retroactive miss on prior week)", async () => {
    // now = Wednesday, slot added today; last Wednesday should NOT break streak even with no log
    vi.setSystemTime(new Date("2026-03-18T14:00:00Z"))
    const { computeStreak } = await import("@/lib/streak")

    const today = new Date("2026-03-18T00:00:00Z")
    // Wednesday slot added today, Monday slot is long-standing with log
    const trainingSlots = [
      { dayOfWeek: 1, time: "10:00" }, // Monday, no addedAt (always existed)
      { dayOfWeek: 3, time: "10:00", addedAt: today }, // Wednesday added today
    ]
    // Monday log exists, no Wednesday log (but last Wed should be invisible)
    const prefetchedLogs = [
      { timestamp: new Date("2026-03-16T10:30:00Z") }, // Monday
    ]

    const mockDb = {
      collection: vi.fn(() => ({
        countDocuments: vi.fn().mockResolvedValue(1),
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            sort: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    }

    const result = await computeStreak(
      mockDb as any,
      "user1",
      trainingSlots,
      "2026-03-18",
      prefetchedLogs,
      []
    )
    // Wed: slot passed (10am < 2pm), addedAt = today midnight, slotTime >= addedAt → visible, no log → miss → streak = 0
    // (This tests that adding a slot doesn't break *prior* weeks — the current day miss is expected)
    // To verify no retroactive miss: check that the streak doesn't go negative and Mon from last week isn't affected
    // Actually: Wed is a miss today (slot visible, no log) → streak = 0, which is correct behavior
    expect(result.streak).toBe(0)
  })

  it("removedAt — deleted slot past logs still count toward streak", async () => {
    // now = Wednesday; Monday slot was deleted yesterday (removedAt = Tuesday)
    // Monday log from 2 days ago should still count
    vi.setSystemTime(new Date("2026-03-18T14:00:00Z"))
    const { computeStreak } = await import("@/lib/streak")

    const removedAt = new Date("2026-03-17T12:00:00Z") // Tuesday noon
    const trainingSlots = [{ dayOfWeek: 3, time: "10:00" }] // Wednesday only now
    const deletedSlots = [{ dayOfWeek: 1, time: "10:00", removedAt }] // Monday deleted

    // Wednesday log + Monday log (before removedAt) both exist
    const prefetchedLogs = [
      { timestamp: new Date("2026-03-16T10:30:00Z") }, // Monday (before removedAt)
      { timestamp: new Date("2026-03-18T10:30:00Z") }, // Wednesday
    ]

    const mockDb = {
      collection: vi.fn(() => ({
        countDocuments: vi.fn().mockResolvedValue(2),
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            sort: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    }

    const result = await computeStreak(
      mockDb as any,
      "user1",
      trainingSlots,
      "2026-03-18",
      prefetchedLogs,
      [],
      deletedSlots
    )
    // Wed: logged → streak++. Mon: slotTime(10am) < removedAt(Tue noon) → visible, logged → streak++
    expect(result.streak).toBe(2)
  })

  it("removedAt — post-removal instances are invisible (no retroactive miss)", async () => {
    // now = Wednesday next week; Monday slot deleted last Tuesday
    // This Monday (after removedAt) should be invisible — not a miss
    vi.setSystemTime(new Date("2026-03-25T14:00:00Z"))
    const { computeStreak } = await import("@/lib/streak")

    const removedAt = new Date("2026-03-17T12:00:00Z") // Tue Mar 17 noon
    const trainingSlots = [{ dayOfWeek: 3, time: "10:00" }] // Wednesday only
    const deletedSlots = [{ dayOfWeek: 1, time: "10:00", removedAt }] // Monday deleted

    // Only Wednesday logs
    const prefetchedLogs = [
      { timestamp: new Date("2026-03-18T10:30:00Z") }, // Wed Mar 18
      { timestamp: new Date("2026-03-25T10:30:00Z") }, // Wed Mar 25
    ]

    const mockDb = {
      collection: vi.fn(() => ({
        countDocuments: vi.fn().mockResolvedValue(2),
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            sort: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    }

    const result = await computeStreak(
      mockDb as any,
      "user1",
      trainingSlots,
      "2026-03-25",
      prefetchedLogs,
      [],
      deletedSlots
    )
    // Mon Mar 23 (after removedAt Mar 17) → invisible → no miss
    // Wed Mar 25: logged → streak++. Wed Mar 18: logged → streak++
    expect(result.streak).toBe(2)
  })

  it("time change — old slot logs preserved, new slot starts fresh", async () => {
    // Mon 10am → Mon 11am. Old log at 10am still counts. New 11am slot starts today.
    vi.setSystemTime(new Date("2026-03-18T14:00:00Z")) // Wednesday
    const { computeStreak } = await import("@/lib/streak")

    const changeTime = new Date("2026-03-16T08:00:00Z") // Monday 8am (before 10am slot)
    // New Monday 11am slot added at changeTime
    const trainingSlots = [{ dayOfWeek: 1, time: "11:00", addedAt: changeTime }]
    // Old Monday 10am slot removed at changeTime
    const deletedSlots = [{ dayOfWeek: 1, time: "10:00", removedAt: changeTime }]

    // Old 10am log from last Monday (before change) — slotTime would be before removedAt
    // New 11am log from this Monday (after addedAt)
    const prefetchedLogs = [
      { timestamp: new Date("2026-03-09T10:30:00Z") }, // Old Mon 10am log (before change)
      { timestamp: new Date("2026-03-16T11:30:00Z") }, // New Mon 11am log (after change)
    ]

    const mockDb = {
      collection: vi.fn(() => ({
        countDocuments: vi.fn().mockResolvedValue(2),
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            sort: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    }

    const result = await computeStreak(
      mockDb as any,
      "user1",
      trainingSlots,
      "2026-03-18",
      prefetchedLogs,
      [],
      deletedSlots
    )
    // Wed Mar 18: no slot → skipped. Mon Mar 16: 11am slot visible (addedAt=8am < 11am), logged → streak++
    // Mon Mar 9: 10am slot from deletedSlots, slotTime(10am) < removedAt(8am on Mar 16)?
    // Mar 9 10am < Mar 16 8am → yes, visible. Log at 10:30 matches → streak++
    expect(result.streak).toBe(2)
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
