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

import { canManageGroup } from "@/lib/api-auth"

// Real 24-char hex ids: canManageGroup parses them with safeObjectId, so
// placeholder strings would be rejected before any lookup happens.
const USER_ID = "507f1f77bcf86cd799439011"
const GROUP_ID = "507f1f77bcf86cd799439012"
const OTHER_USER_ID = "507f1f77bcf86cd799439013"
const OTHER_GROUP_ID = "507f1f77bcf86cd799439014"

function createMockDb(
  userDoc: Record<string, unknown> | null,
  groupDoc: Record<string, unknown> | null,
) {
  return {
    collection: function (name: string) {
      return {
        findOne: function () {
          if (name === "users") return Promise.resolve(userDoc)
          if (name === "groups") return Promise.resolve(groupDoc)
          return Promise.resolve(null)
        },
      }
    },
  } as any
}

describe("canManageGroup", () => {
  it("returns false if user not found", async () => {
    const db = createMockDb(null, null)
    expect(await canManageGroup(db, USER_ID, GROUP_ID)).toBe(false)
  })

  it("returns false if user is not a coach", async () => {
    const db = createMockDb(
      { _id: USER_ID, role: "athlete" },
      { _id: GROUP_ID, coachIds: [USER_ID] },
    )
    expect(await canManageGroup(db, USER_ID, GROUP_ID)).toBe(false)
  })

  it("returns false if group not found", async () => {
    const db = createMockDb({ _id: USER_ID, role: "coach" }, null)
    expect(await canManageGroup(db, USER_ID, GROUP_ID)).toBe(false)
  })

  it("returns true if userId is in coachIds", async () => {
    const db = createMockDb(
      { _id: USER_ID, role: "coach", groupIds: [] },
      { _id: GROUP_ID, coachIds: [USER_ID] },
    )
    expect(await canManageGroup(db, USER_ID, GROUP_ID)).toBe(true)
  })

  it("falls back to singular headCoachId if coachIds not present", async () => {
    const db = createMockDb(
      { _id: USER_ID, role: "coach", groupIds: [] },
      { _id: GROUP_ID, headCoachId: USER_ID },
    )
    expect(await canManageGroup(db, USER_ID, GROUP_ID)).toBe(true)
  })

  it("returns true if groupId is in user.groupIds", async () => {
    const db = createMockDb(
      { _id: USER_ID, role: "coach", groupIds: [GROUP_ID] },
      { _id: GROUP_ID, coachIds: [OTHER_USER_ID] },
    )
    expect(await canManageGroup(db, USER_ID, GROUP_ID)).toBe(true)
  })

  it("falls back to singular activeGroupId on user", async () => {
    const db = createMockDb(
      { _id: USER_ID, role: "coach", activeGroupId: GROUP_ID },
      { _id: GROUP_ID, coachIds: [OTHER_USER_ID] },
    )
    expect(await canManageGroup(db, USER_ID, GROUP_ID)).toBe(true)
  })

  it("returns false for a malformed id instead of throwing a 500", async () => {
    // Ids arrive from route params and bodies; constructing an ObjectId from a
    // malformed one used to throw, surfacing as a generic 500.
    const db = createMockDb(
      { _id: USER_ID, role: "coach", groupIds: [GROUP_ID] },
      { _id: GROUP_ID, coachIds: [USER_ID] },
    )
    expect(await canManageGroup(db, "not-an-id", GROUP_ID)).toBe(false)
    expect(await canManageGroup(db, USER_ID, "not-an-id")).toBe(false)
    expect(await canManageGroup(db, "", "")).toBe(false)
  })

  it("returns false if coach has no relation to group", async () => {
    const db = createMockDb(
      { _id: USER_ID, role: "coach", groupIds: [OTHER_GROUP_ID] },
      { _id: GROUP_ID, coachIds: [OTHER_USER_ID] },
    )
    expect(await canManageGroup(db, USER_ID, GROUP_ID)).toBe(false)
  })
})
