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

import {
  COACH_VISIBILITY_CONDITION,
  isLogVisibleToCoach,
  buildVisibilityFilter,
  applyDateFilter,
  applyCursorFilter,
} from "@/lib/log-filters"

/**
 * Minimal stand-in for the `db.collection(x).find(q).project(p).toArray()` chain.
 * `docsByCollection` maps a collection name to the documents `find()` resolves to;
 * every query issued is recorded so tests can assert on the filter that was built.
 */
function createMockDb(docsByCollection: Record<string, Record<string, unknown>[]>) {
  const queries: { collection: string; filter: unknown }[] = []
  const db = {
    collection(name: string) {
      return {
        find(filter: unknown) {
          queries.push({ collection: name, filter })
          return {
            project() {
              return {
                toArray: () => Promise.resolve(docsByCollection[name] ?? []),
              }
            },
          }
        },
      }
    },
  } as never
  return { db, queries }
}

describe("isLogVisibleToCoach", () => {
  it("shows logs explicitly shared with coaches", () => {
    expect(isLogVisibleToCoach({ visibility: "coach" })).toBe(true)
  })

  it("hides private logs — the whole point of the rule", () => {
    expect(isLogVisibleToCoach({ visibility: "private" })).toBe(false)
    expect(isLogVisibleToCoach({ visibility: "private", isGroup: true })).toBe(false)
  })

  it("shows legacy group logs that predate the visibility field", () => {
    expect(isLogVisibleToCoach({ isGroup: true })).toBe(true)
  })

  it("hides legacy solo logs that predate the visibility field", () => {
    expect(isLogVisibleToCoach({ isGroup: false })).toBe(false)
    expect(isLogVisibleToCoach({})).toBe(false)
  })

  it("hides logs with an unrecognized visibility value", () => {
    // API-14: `visibility` is currently stored verbatim, so junk values must not
    // fall through to "visible". They are owner-only, same as private.
    expect(isLogVisibleToCoach({ visibility: "banana" })).toBe(false)
    expect(isLogVisibleToCoach({ visibility: "banana", isGroup: true })).toBe(false)
  })

  it("treats a null visibility as not-visible (null !== undefined)", () => {
    expect(isLogVisibleToCoach({ visibility: null, isGroup: true })).toBe(false)
  })

  it("stays in step with the Mongo condition it mirrors", () => {
    // Both arms of COACH_VISIBILITY_CONDITION must have an in-memory counterpart.
    const [coachArm, legacyArm] = COACH_VISIBILITY_CONDITION.$or
    expect(coachArm).toEqual({ visibility: "coach" })
    expect(legacyArm).toEqual({ visibility: { $exists: false }, isGroup: true })
    expect(isLogVisibleToCoach({ visibility: "coach" })).toBe(true)
    expect(isLogVisibleToCoach({ isGroup: true })).toBe(true)
  })
})

describe("buildVisibilityFilter", () => {
  const base = {
    userId: "athlete1",
    userRole: "athlete",
    userGroupId: null as string | null,
    filterUserIds: [] as string[],
    filterRoleIds: [] as string[],
  }

  it("scopes a groupless user to their own logs only", async () => {
    const { db } = createMockDb({})
    const filter = await buildVisibilityFilter(db, base)
    expect(filter).toEqual({ userId: "athlete1" })
  })

  it("scopes an athlete to their own logs even inside a group", async () => {
    const { db } = createMockDb({
      users: [{ _id: "athlete1" }, { _id: "athlete2" }],
    })
    const filter = await buildVisibilityFilter(db, { ...base, userGroupId: "g1" })
    // An athlete never sees a peer's logs — only their own, scoped to the group
    // (plus pre-migration logs with no groupId).
    expect(filter.userId).toBe("athlete1")
    expect(filter.$or).toEqual([
      { groupId: "g1" },
      { groupId: { $exists: false } },
      { groupId: null },
    ])
  })

  it("gives a coach every group member's logs, gated by the visibility rule", async () => {
    const { db } = createMockDb({
      users: [{ _id: "athlete1" }, { _id: "athlete2" }],
    })
    const filter = await buildVisibilityFilter(db, {
      ...base,
      userId: "coach1",
      userRole: "coach",
      userGroupId: "g1",
    })
    expect(filter.userId).toEqual({ $in: ["athlete1", "athlete2"] })
    expect(filter.$and).toEqual([
      COACH_VISIBILITY_CONDITION,
      { $or: [{ groupId: "g1" }, { groupId: { $exists: false } }, { groupId: null }] },
    ])
  })

  it("narrows a coach to the requested athletes when they are members", async () => {
    const { db } = createMockDb({
      users: [{ _id: "athlete1" }, { _id: "athlete2" }],
    })
    const filter = await buildVisibilityFilter(db, {
      ...base,
      userId: "coach1",
      userRole: "coach",
      userGroupId: "g1",
      filterUserIds: ["athlete2"],
    })
    expect(filter.userId).toEqual({ $in: ["athlete2"] })
  })

  it("returns a match-nothing filter when a coach asks for non-members", async () => {
    const { db } = createMockDb({
      users: [{ _id: "athlete1" }],
    })
    const filter = await buildVisibilityFilter(db, {
      ...base,
      userId: "coach1",
      userRole: "coach",
      userGroupId: "g1",
      filterUserIds: ["outsider"],
    })
    // A coach must not be able to read an arbitrary userId's logs by passing it in.
    expect(filter).toEqual({ _id: null })
  })

  it("intersects role filters with group membership", async () => {
    const { db } = createMockDb({
      users: [{ _id: "athlete1" }, { _id: "athlete2" }],
      groupMemberships: [{ userId: "athlete2" }],
    })
    const filter = await buildVisibilityFilter(db, {
      ...base,
      userId: "coach1",
      userRole: "coach",
      userGroupId: "g1",
      filterRoleIds: ["role1"],
    })
    expect(filter.userId).toEqual({ $in: ["athlete2"] })
  })

  it("ignores role filters for non-coaches", async () => {
    const { db, queries } = createMockDb({
      users: [{ _id: "athlete1" }],
      groupMemberships: [{ userId: "athlete1" }],
    })
    await buildVisibilityFilter(db, {
      ...base,
      userGroupId: "g1",
      filterRoleIds: ["role1"],
    })
    expect(queries.some((q) => q.collection === "groupMemberships")).toBe(false)
  })

  it("reads membership from users.groupIds", async () => {
    // Pinned because migration M3 moves this to the groupMemberships collection —
    // this assertion should be updated deliberately, not incidentally.
    const { db, queries } = createMockDb({ users: [] })
    await buildVisibilityFilter(db, {
      ...base,
      userId: "coach1",
      userRole: "coach",
      userGroupId: "g1",
    })
    expect(queries[0]).toEqual({ collection: "users", filter: { groupIds: "g1" } })
  })
})

describe("applyDateFilter", () => {
  it("returns the filter untouched when no date params are given", () => {
    const filter = { userId: "u1" }
    expect(applyDateFilter(filter, null, null, null)).toEqual({ userId: "u1" })
  })

  it("builds a day range per date in the dates param", () => {
    const result = applyDateFilter({ userId: "u1" }, null, null, "2026-08-10,2026-08-11")
    const or = (result.$and as Record<string, unknown>[])[1].$or as {
      timestamp: { $gte: Date; $lte: Date }
    }[]
    expect(or).toHaveLength(2)
    expect(or[0].timestamp.$gte.getDate()).toBe(10)
    expect(or[0].timestamp.$lte.getHours()).toBe(23)
  })

  it("skips malformed dates rather than producing an Invalid Date range", () => {
    const result = applyDateFilter({ userId: "u1" }, null, null, "not-a-date")
    expect(result).toEqual({ userId: "u1" })
  })

  it("applies an open-ended range from dateFrom/dateTo", () => {
    const result = applyDateFilter({ userId: "u1" }, "2026-08-01", null, null)
    expect((result.timestamp as Record<string, Date>).$gte).toEqual(new Date("2026-08-01"))
    expect((result.timestamp as Record<string, Date>).$lte).toBeUndefined()
  })

  it("prefers the dates param over dateFrom/dateTo", () => {
    const result = applyDateFilter({ userId: "u1" }, "2026-08-01", "2026-08-05", "2026-08-10")
    expect(result.timestamp).toBeUndefined()
    expect(result.$and).toBeDefined()
  })
})

describe("applyCursorFilter", () => {
  it("returns the filter unchanged without a cursor", () => {
    expect(applyCursorFilter({ userId: "u1" }, null)).toEqual({ userId: "u1" })
  })

  it("builds a timestamp/_id tiebreak condition so pagination cannot skip rows", () => {
    const ts = "2026-08-10T00:00:00.000Z"
    const result = applyCursorFilter({ userId: "u1" }, `${ts}|507f1f77bcf86cd799439011`)
    const cursor = (result.$and as Record<string, unknown>[])[1]
    const or = cursor.$or as Record<string, Record<string, unknown>>[]
    expect(or[0].timestamp.$lt).toEqual(new Date(ts))
    expect(or[1].timestamp).toEqual(new Date(ts))
    expect(or[1]._id.$lt?.toString()).toBe("507f1f77bcf86cd799439011")
  })

  it("ignores a cursor with an unparseable timestamp", () => {
    const result = applyCursorFilter({ userId: "u1" }, "garbage|507f1f77bcf86cd799439011")
    expect(result).toEqual({ userId: "u1" })
  })

  it("ignores a cursor with no separator", () => {
    expect(applyCursorFilter({ userId: "u1" }, "nosep")).toEqual({ userId: "u1" })
  })
})
