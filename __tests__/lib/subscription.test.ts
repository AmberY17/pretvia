import { describe, it, expect, vi } from "vitest"

vi.mock("mongodb", () => ({
  ObjectId: class ObjectId {
    private id: string
    constructor(id: string) {
      this.id = id
    }
    toString() {
      return this.id
    }
  },
}))

import { getEffectiveLimits, getUserSubscription } from "@/lib/subscription"
import type { CoachSubscription } from "@/types/dashboard"

function sub(overrides: Partial<CoachSubscription> = {}): CoachSubscription {
  return { plan: "squad", isAssistant: false, addOnGroups: 0, addOnSeats: 0, ...overrides }
}

function createMockDb(userDoc: Record<string, unknown> | null) {
  return {
    collection() {
      return { findOne: () => Promise.resolve(userDoc) }
    },
  } as never
}

describe("getEffectiveLimits", () => {
  it("gives an assistant coach no allowance of their own", () => {
    // Assistants coach someone else's groups — they must not be able to create any.
    expect(getEffectiveLimits(sub({ isAssistant: true, plan: "club" }))).toEqual({
      groups: 0,
      coachSeats: 0,
    })
  })

  it("assistant status overrides even generous add-ons", () => {
    expect(
      getEffectiveLimits(sub({ isAssistant: true, plan: "club", addOnGroups: 9, addOnSeats: 9 })),
    ).toEqual({ groups: 0, coachSeats: 0 })
  })

  it("applies base plan limits", () => {
    expect(getEffectiveLimits(sub({ plan: "squad" }))).toEqual({ groups: 1, coachSeats: 0 })
    expect(getEffectiveLimits(sub({ plan: "club" }))).toEqual({ groups: 10, coachSeats: 3 })
  })

  it("keeps varsity groups unlimited regardless of add-ons", () => {
    expect(getEffectiveLimits(sub({ plan: "varsity", addOnGroups: 4 })).groups).toBe(Infinity)
  })

  it("adds 5 groups per group add-on and 3 seats per seat add-on", () => {
    expect(getEffectiveLimits(sub({ plan: "squad", addOnGroups: 2 })).groups).toBe(11)
    expect(getEffectiveLimits(sub({ plan: "club", addOnSeats: 2 })).coachSeats).toBe(9)
  })
})

describe("getUserSubscription", () => {
  it("defaults to the squad plan when the user has no subscription", async () => {
    const result = await getUserSubscription(createMockDb({ _id: "u1" }), "u1")
    expect(result).toEqual({ plan: "squad", isAssistant: false, addOnGroups: 0, addOnSeats: 0 })
  })

  it("defaults when the user document is missing entirely", async () => {
    const result = await getUserSubscription(createMockDb(null), "u1")
    expect(result.plan).toBe("squad")
  })

  it("fills each missing field individually rather than discarding the record", async () => {
    const result = await getUserSubscription(
      createMockDb({ _id: "u1", subscription: { plan: "club" } }),
      "u1",
    )
    expect(result).toEqual({ plan: "club", isAssistant: false, addOnGroups: 0, addOnSeats: 0 })
  })

  it("preserves a false isAssistant rather than treating it as absent", async () => {
    const result = await getUserSubscription(
      createMockDb({ _id: "u1", subscription: { plan: "club", isAssistant: false } }),
      "u1",
    )
    expect(result.isAssistant).toBe(false)
  })

  it("reads a fully populated subscription verbatim", async () => {
    const result = await getUserSubscription(
      createMockDb({
        _id: "u1",
        subscription: { plan: "varsity", isAssistant: true, addOnGroups: 1, addOnSeats: 2 },
      }),
      "u1",
    )
    expect(result).toEqual({
      plan: "varsity",
      isAssistant: true,
      addOnGroups: 1,
      addOnSeats: 2,
    })
  })
})
