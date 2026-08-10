import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ getSession: vi.fn(), deleteSession: vi.fn() }))
vi.mock("mongodb", () => ({
  ObjectId: class {
    id: string
    constructor(id: string) {
      this.id = id
    }
    toString() {
      return this.id
    }
  },
}))

const startSession = vi.fn()
vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
  default: Promise.resolve({ startSession: () => startSession() }),
}))

import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { DELETE } from "@/app/api/auth/account/route"

type Op = { collection: string; op: string; filter: unknown; update?: unknown }

const OWNED_GROUP = { _id: { toString: () => "ownedGroup" } }

/**
 * `groupsFound` is what the owned-groups query resolves to — the test controls it
 * to represent "user owns this group" vs "user is only an assistant".
 */
function makeDb(groupsFound: unknown[]) {
  const ops: Op[] = []
  const cursor = (docs: unknown[]) => ({
    project: () => cursor(docs),
    toArray: () => Promise.resolve(docs),
  })

  const db = {
    collection: (name: string) => ({
      findOne: (filter: unknown) => {
        ops.push({ collection: name, op: "findOne", filter })
        if (name === "users") return Promise.resolve({ _id: "u1", email: "Coach@Example.com " })
        return Promise.resolve(null)
      },
      find: (filter: unknown) => {
        ops.push({ collection: name, op: "find", filter })
        if (name === "groups") return cursor(groupsFound)
        return cursor([])
      },
      deleteOne: (filter: unknown) => {
        ops.push({ collection: name, op: "deleteOne", filter })
        return Promise.resolve({ deletedCount: 1 })
      },
      deleteMany: (filter: unknown) => {
        ops.push({ collection: name, op: "deleteMany", filter })
        return Promise.resolve({ deletedCount: 1 })
      },
      updateMany: (filter: unknown, update: unknown) => {
        ops.push({ collection: name, op: "updateMany", filter, update })
        return Promise.resolve({ modifiedCount: 1 })
      },
    }),
  }
  return { db, ops }
}

const opsOn = (ops: Op[], collection: string) => ops.filter((o) => o.collection === collection)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue({ userId: "u1" } as never)
  // Exercise the non-transactional fallback path: a standalone mongod cannot start
  // a transaction, and the route must still complete the cascade.
  startSession.mockReturnValue({
    withTransaction: () => {
      throw new Error("Transaction numbers are only allowed on a replica set member or mongos")
    },
    endSession: () => Promise.resolve(),
  })
})

describe("DELETE /api/auth/account — cascade scope", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await DELETE()
    expect(res.status).toBe(401)
  })

  it("deletes a group the user owns", async () => {
    const { db, ops } = makeDb([OWNED_GROUP])
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await DELETE()
    expect(res.status).toBe(200)

    const deletedGroups = opsOn(ops, "groups").filter((o) => o.op === "deleteOne")
    expect(deletedGroups).toHaveLength(1)
  })

  it("does NOT delete a group the user only assists — it removes them from coachIds", async () => {
    // The owned-groups query returns nothing: this user is in coachIds but is not
    // the head coach. Previously the cascade matched coachIds too and destroyed
    // the head coach's group, athletes' checkins, attendance and announcements.
    const { db, ops } = makeDb([])
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await DELETE()
    expect(res.status).toBe(200)

    expect(opsOn(ops, "groups").filter((o) => o.op === "deleteOne")).toHaveLength(0)
    expect(opsOn(ops, "checkins").filter((o) => o.op === "deleteMany" && isGroupScoped(o))).toHaveLength(0)
    expect(opsOn(ops, "announcements")).toHaveLength(0)
    expect(opsOn(ops, "attendance").filter((o) => o.op === "deleteMany")).toHaveLength(0)

    const pull = opsOn(ops, "groups").find((o) => o.op === "updateMany")
    expect(pull?.update).toHaveProperty("$pull")
  })

  it("scopes the owned-group query to headCoachId only", async () => {
    const { db, ops } = makeDb([])
    vi.mocked(getDb).mockResolvedValue(db as never)
    await DELETE()

    const groupQuery = opsOn(ops, "groups").find((o) => o.op === "find")
    expect(groupQuery?.filter).toHaveProperty("headCoachId")
    expect(groupQuery?.filter).not.toHaveProperty("$or")
  })

  it("matches both string and ObjectId forms of the owner id", async () => {
    const { db, ops } = makeDb([])
    vi.mocked(getDb).mockResolvedValue(db as never)
    await DELETE()

    const groupQuery = opsOn(ops, "groups").find((o) => o.op === "find")
    const inList = (groupQuery?.filter as { headCoachId: { $in: unknown[] } }).headCoachId.$in
    expect(inList).toHaveLength(2)
    expect(inList.map(String)).toEqual(["u1", "u1"])
  })
})

describe("DELETE /api/auth/account — dangling references", () => {
  it("clears members' groupIds and activeGroupId for deleted groups", async () => {
    const { db, ops } = makeDb([OWNED_GROUP])
    vi.mocked(getDb).mockResolvedValue(db as never)
    await DELETE()

    const userUpdates = opsOn(ops, "users").filter((o) => o.op === "updateMany")
    const pulled = userUpdates.find((o) => JSON.stringify(o.update).includes("$pull"))
    const unset = userUpdates.find((o) => JSON.stringify(o.update).includes("$unset"))

    expect(pulled?.update).toEqual({ $pull: { groupIds: { $in: ["ownedGroup"] } } })
    expect(unset?.update).toEqual({ $unset: { activeGroupId: "" } })
  })

  it("skips the member cleanup entirely when no group was deleted", async () => {
    const { db, ops } = makeDb([])
    vi.mocked(getDb).mockResolvedValue(db as never)
    await DELETE()

    expect(opsOn(ops, "users").filter((o) => o.op === "updateMany")).toHaveLength(0)
  })
})

describe("DELETE /api/auth/account — log reviews", () => {
  it("deletes reviews by the current coachId field, not only the legacy one", async () => {
    // Reviews are written with `coachId`; `headCoachId` is the legacy name. Matching
    // only the legacy field orphaned every review this coach had written.
    const { db, ops } = makeDb([])
    vi.mocked(getDb).mockResolvedValue(db as never)
    await DELETE()

    const review = opsOn(ops, "log_reviews").find((o) => o.op === "deleteMany")
    const or = (review?.filter as { $or: Record<string, unknown>[] }).$or
    expect(or).toContainEqual({ coachId: "u1" })
    expect(or).toContainEqual({ headCoachId: "u1" })
  })
})

describe("DELETE /api/auth/account — email-keyed artifacts", () => {
  it("normalizes the email before matching waitlist and token rows", async () => {
    // The stored email is "Coach@Example.com " — mixed case with a trailing space.
    const { db, ops } = makeDb([])
    vi.mocked(getDb).mockResolvedValue(db as never)
    await DELETE()

    const waitlist = opsOn(ops, "waitlist").find((o) => o.op === "deleteMany")
    expect(waitlist?.filter).toEqual({ email: "coach@example.com" })
  })
})

describe("DELETE /api/auth/account — transaction path", () => {
  it("runs the cascade inside a transaction when the deployment supports one", async () => {
    const endSession = vi.fn().mockResolvedValue(undefined)
    let ranInTransaction = false
    startSession.mockReturnValue({
      withTransaction: async (fn: () => Promise<void>) => {
        ranInTransaction = true
        await fn()
      },
      endSession,
    })

    const { db, ops } = makeDb([OWNED_GROUP])
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await DELETE()
    expect(res.status).toBe(200)
    expect(ranInTransaction).toBe(true)
    expect(endSession).toHaveBeenCalled()
    expect(opsOn(ops, "groups").filter((o) => o.op === "deleteOne")).toHaveLength(1)
  })

  it("surfaces a real failure as a 500 rather than silently retrying unwrapped", async () => {
    // Only "transactions unsupported" falls back. A genuine write error must not
    // cause the cascade to be replayed outside the transaction.
    let calls = 0
    startSession.mockReturnValue({
      withTransaction: async () => {
        calls += 1
        throw new Error("WriteConflict")
      },
      endSession: vi.fn().mockResolvedValue(undefined),
    })

    const { db } = makeDb([OWNED_GROUP])
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await DELETE()
    expect(res.status).toBe(500)
    expect(calls).toBe(1)
  })

  it("returns 404 when the user document is gone", async () => {
    startSession.mockReturnValue({
      withTransaction: async (fn: () => Promise<void>) => {
        await fn()
      },
      endSession: vi.fn().mockResolvedValue(undefined),
    })

    const { db } = makeDb([])
    const noUser = {
      ...db,
      collection: (name: string) => ({
        ...db.collection(name),
        findOne: () => Promise.resolve(null),
      }),
    }
    vi.mocked(getDb).mockResolvedValue(noUser as never)

    const res = await DELETE()
    expect(res.status).toBe(404)
  })
})

function isGroupScoped(op: Op): boolean {
  return typeof op.filter === "object" && op.filter !== null && "groupId" in op.filter
}
