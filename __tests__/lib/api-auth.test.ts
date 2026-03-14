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
    expect(await canManageGroup(db, "user1", "group1")).toBe(false)
  })

  it("returns false if user is not a coach", async () => {
    const db = createMockDb(
      { _id: "user1", role: "athlete" },
      { _id: "group1", coachIds: ["user1"] },
    )
    expect(await canManageGroup(db, "user1", "group1")).toBe(false)
  })

  it("returns false if group not found", async () => {
    const db = createMockDb({ _id: "user1", role: "coach" }, null)
    expect(await canManageGroup(db, "user1", "group1")).toBe(false)
  })

  it("returns true if userId is in coachIds", async () => {
    const db = createMockDb(
      { _id: "user1", role: "coach", groupIds: [] },
      { _id: "group1", coachIds: ["user1"] },
    )
    expect(await canManageGroup(db, "user1", "group1")).toBe(true)
  })

  it("falls back to singular coachId if coachIds not present", async () => {
    const db = createMockDb(
      { _id: "user1", role: "coach", groupIds: [] },
      { _id: "group1", coachId: "user1" },
    )
    expect(await canManageGroup(db, "user1", "group1")).toBe(true)
  })

  it("returns true if groupId is in user.groupIds", async () => {
    const db = createMockDb(
      { _id: "user1", role: "coach", groupIds: ["group1"] },
      { _id: "group1", coachIds: ["other"] },
    )
    expect(await canManageGroup(db, "user1", "group1")).toBe(true)
  })

  it("falls back to singular groupId on user", async () => {
    const db = createMockDb(
      { _id: "user1", role: "coach", groupId: "group1" },
      { _id: "group1", coachIds: ["other"] },
    )
    expect(await canManageGroup(db, "user1", "group1")).toBe(true)
  })

  it("returns false if coach has no relation to group", async () => {
    const db = createMockDb(
      { _id: "user1", role: "coach", groupIds: ["other-group"] },
      { _id: "group1", coachIds: ["other-user"] },
    )
    expect(await canManageGroup(db, "user1", "group1")).toBe(false)
  })
})
