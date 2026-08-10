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

vi.mock("@/lib/auth", () => ({ createSession: vi.fn() }))
vi.mock("@/lib/group-training-schedule", () => ({
  applyGroupTrainingScheduleToUser: vi.fn(),
}))

import { ensureGroupIds, insertGroupWithUniqueCode, addUserToGroup } from "@/lib/group-actions"
import { createSession } from "@/lib/auth"
import { applyGroupTrainingScheduleToUser } from "@/lib/group-training-schedule"

type Write = { collection: string; filter: unknown; update: unknown; options?: unknown }

/**
 * Records every updateOne so tests can assert which of the three membership
 * stores (users.groupIds / groupMemberships / groups.coachIds) were written.
 */
function createMockDb(opts: {
  user?: Record<string, unknown> | null
  findOneByCollection?: Record<string, () => unknown>
}) {
  const writes: Write[] = []
  const db = {
    collection(name: string) {
      return {
        findOne: () => {
          const custom = opts.findOneByCollection?.[name]
          if (custom) return Promise.resolve(custom())
          if (name === "users") return Promise.resolve(opts.user ?? null)
          return Promise.resolve(null)
        },
        updateOne: (filter: unknown, update: unknown, options?: unknown) => {
          writes.push({ collection: name, filter, update, options })
          return Promise.resolve({ acknowledged: true })
        },
      }
    },
  } as never
  return { db, writes }
}

const writesTo = (writes: Write[], collection: string) =>
  writes.filter((w) => w.collection === collection)

describe("ensureGroupIds", () => {
  it("returns null for a missing user without writing", async () => {
    const { db, writes } = createMockDb({ user: null })
    expect(await ensureGroupIds(db, "u1")).toBeNull()
    expect(writes).toHaveLength(0)
  })

  it("backfills groupIds from activeGroupId when the array is missing", async () => {
    const { db, writes } = createMockDb({ user: { _id: "u1", activeGroupId: "g1" } })
    const user = await ensureGroupIds(db, "u1")
    expect(user?.groupIds).toEqual(["g1"])
    expect(writesTo(writes, "users")[0].update).toEqual({ $set: { groupIds: ["g1"] } })
  })

  it("adds a drifted activeGroupId to an existing groupIds array", async () => {
    const { db } = createMockDb({ user: { _id: "u1", activeGroupId: "g2", groupIds: ["g1"] } })
    const user = await ensureGroupIds(db, "u1")
    expect(user?.groupIds).toEqual(["g1", "g2"])
  })

  it("writes nothing when the stores already agree", async () => {
    const { db, writes } = createMockDb({
      user: { _id: "u1", activeGroupId: "g1", groupIds: ["g1"] },
    })
    await ensureGroupIds(db, "u1")
    expect(writes).toHaveLength(0)
  })

  it("normalizes a missing groupIds to [] for a user with no active group", async () => {
    const { db, writes } = createMockDb({ user: { _id: "u1" } })
    const user = await ensureGroupIds(db, "u1")
    expect(user?.groupIds).toEqual([])
    expect(writesTo(writes, "users")[0].update).toEqual({ $set: { groupIds: [] } })
  })
})

describe("insertGroupWithUniqueCode", () => {
  /** Mock whose insertOne fails with a duplicate-code error `failures` times. */
  function dbWithCodeCollisions(failures: number, errOverride?: unknown) {
    let attempts = 0
    const codes: string[] = []
    const db = {
      collection: () => ({
        insertOne: (doc: { code: string }) => {
          attempts += 1
          codes.push(doc.code)
          if (attempts <= failures) {
            return Promise.reject(
              errOverride ?? Object.assign(new Error("E11000"), { code: 11000, keyPattern: { code: 1 } }),
            )
          }
          return Promise.resolve({ insertedId: { toString: () => "newGroup" } })
        },
      }),
    } as never
    return { db, codes, getAttempts: () => attempts }
  }

  it("inserts with a 6-character code from the unambiguous alphabet", async () => {
    const { db, codes } = dbWithCodeCollisions(0)
    const { groupId, code } = await insertGroupWithUniqueCode(db, { name: "G" })

    expect(groupId).toBe("newGroup")
    // Ambiguous glyphs are excluded so codes can be read aloud / typed from a whiteboard.
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
    expect(codes[0]).toBe(code)
  })

  it("retries with a fresh code when the unique index rejects a collision", async () => {
    const { db, codes, getAttempts } = dbWithCodeCollisions(2)
    const { code } = await insertGroupWithUniqueCode(db, { name: "G" })

    expect(getAttempts()).toBe(3)
    expect(code).toBe(codes[2])
    // Each retry must generate a new code, not resubmit the rejected one.
    expect(new Set(codes).size).toBe(3)
  })

  it("gives up rather than looping forever", async () => {
    const { db, getAttempts } = dbWithCodeCollisions(Infinity)
    await expect(insertGroupWithUniqueCode(db, { name: "G" }, 3)).rejects.toThrow(
      "Could not allocate a unique group code",
    )
    expect(getAttempts()).toBe(3)
  })

  it("rethrows an unrelated write error instead of retrying it", async () => {
    // Retrying a non-collision failure would mask a real problem.
    const { db, getAttempts } = dbWithCodeCollisions(Infinity, new Error("connection reset"))
    await expect(insertGroupWithUniqueCode(db, { name: "G" })).rejects.toThrow("connection reset")
    expect(getAttempts()).toBe(1)
  })

  it("rethrows a duplicate-key error on a different index", async () => {
    const dupOnOtherField = Object.assign(new Error("E11000"), {
      code: 11000,
      keyPattern: { name: 1 },
    })
    const { db, getAttempts } = dbWithCodeCollisions(Infinity, dupOnOtherField)
    await expect(insertGroupWithUniqueCode(db, { name: "G" })).rejects.toThrow("E11000")
    expect(getAttempts()).toBe(1)
  })
})

describe("addUserToGroup", () => {
  const session = { userId: "u1", email: "a@b.com", role: "athlete" }

  it("writes users.groupIds and groupMemberships together", async () => {
    const { db, writes } = createMockDb({})
    await addUserToGroup(db, session as never, "g1", { _id: "g1" } as never, "athlete")

    expect(writesTo(writes, "users")[0].update).toEqual({
      $set: { activeGroupId: "g1" },
      $addToSet: { groupIds: "g1" },
    })
    const membership = writesTo(writes, "groupMemberships")[0]
    expect(membership.filter).toEqual({ userId: "u1", groupId: "g1" })
    expect(membership.options).toEqual({ upsert: true })
  })

  it("does not touch groups.coachIds for an athlete", async () => {
    const { db, writes } = createMockDb({})
    await addUserToGroup(db, session as never, "g1", { _id: "g1" } as never, "athlete")
    expect(writesTo(writes, "groups")).toHaveLength(0)
  })

  it("adds a coach to groups.coachIds — all three stores written", async () => {
    const { db, writes } = createMockDb({})
    await addUserToGroup(db, session as never, "g1", { _id: "g1" } as never, "coach")
    expect(writesTo(writes, "groups")[0].update).toEqual({ $addToSet: { coachIds: "u1" } })
    expect(writesTo(writes, "users")).toHaveLength(1)
    expect(writesTo(writes, "groupMemberships")).toHaveLength(1)
  })

  it("applies the group's training schedule template when it has one", async () => {
    const { db } = createMockDb({})
    const slots = [{ dayOfWeek: 1, time: "17:00" }]
    await addUserToGroup(
      db,
      session as never,
      "g1",
      { _id: "g1", trainingScheduleTemplate: slots } as never,
      "athlete",
    )
    expect(applyGroupTrainingScheduleToUser).toHaveBeenCalledWith(db, "u1", "g1", slots)
  })

  it("skips the schedule apply when the template is empty", async () => {
    vi.mocked(applyGroupTrainingScheduleToUser).mockClear()
    const { db } = createMockDb({})
    await addUserToGroup(db, session as never, "g1", { _id: "g1", trainingScheduleTemplate: [] } as never, "athlete")
    expect(applyGroupTrainingScheduleToUser).not.toHaveBeenCalled()
  })

  it("re-issues the session so activeGroupId is not stale", async () => {
    const { db } = createMockDb({})
    await addUserToGroup(db, session as never, "g1", { _id: "g1" } as never, "athlete")
    expect(createSession).toHaveBeenCalledWith({ ...session, activeGroupId: "g1" })
  })
})
