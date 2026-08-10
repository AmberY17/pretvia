import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }))
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }))
vi.mock("@/lib/api-auth", () => ({ canManageGroup: vi.fn() }))
vi.mock("@/lib/objectid", () => ({
  safeObjectId: vi.fn((id: string) => (id === "bad" ? null : { toString: () => id })),
}))

import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { canManageGroup } from "@/lib/api-auth"
import { POST, PATCH, DELETE } from "@/app/api/groups/[groupId]/roles/route"

type Update = { filter: Record<string, unknown>; update: Record<string, unknown> }

function makeDb(result: { matchedCount?: number; modifiedCount?: number } = {}) {
  const updates: Update[] = []
  const db = {
    collection: () => ({
      findOne: () => Promise.resolve({ _id: "g1", roles: [] }),
      updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>) => {
        updates.push({ filter, update })
        return Promise.resolve({ matchedCount: 1, modifiedCount: 1, ...result })
      },
      updateMany: () => Promise.resolve({ modifiedCount: 1 }),
    }),
  }
  return { db, updates }
}

const params = Promise.resolve({ groupId: "g1" })

const postReq = (body: unknown) =>
  new Request("http://localhost/api/groups/g1/roles", {
    method: "POST",
    body: JSON.stringify(body),
  })

const patchReq = (body: unknown) =>
  new Request("http://localhost/api/groups/g1/roles", {
    method: "PATCH",
    body: JSON.stringify(body),
  })

const deleteReq = (qs: string) =>
  new Request(`http://localhost/api/groups/g1/roles${qs}`, { method: "DELETE" })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue({ userId: "coach1" } as never)
  vi.mocked(canManageGroup).mockResolvedValue(true)
})

describe("roles POST", () => {
  it("appends with $push instead of rewriting the whole array", async () => {
    // A $set of the full array loses a role added concurrently by a co-coach.
    const { db, updates } = makeDb()
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await POST(postReq({ name: "Sprinter" }), { params })
    expect(res.status).toBe(200)

    expect(updates).toHaveLength(1)
    expect(updates[0].update).toHaveProperty("$push")
    expect(updates[0].update).not.toHaveProperty("$set")
    const pushed = (updates[0].update.$push as { roles: { name: string; id: string } }).roles
    expect(pushed.name).toBe("Sprinter")
    expect(pushed.id).toBeTruthy()
  })

  it("404s when the group does not exist", async () => {
    const { db } = makeDb({ matchedCount: 0 })
    vi.mocked(getDb).mockResolvedValue(db as never)
    expect((await POST(postReq({ name: "Sprinter" }), { params })).status).toBe(404)
  })

  it("rejects a blank name", async () => {
    const { db } = makeDb()
    vi.mocked(getDb).mockResolvedValue(db as never)
    expect((await POST(postReq({ name: "   " }), { params })).status).toBe(400)
  })

  it("400s a malformed group id rather than throwing a 500", async () => {
    const { db } = makeDb()
    vi.mocked(getDb).mockResolvedValue(db as never)
    const res = await POST(postReq({ name: "X" }), {
      params: Promise.resolve({ groupId: "bad" }),
    })
    expect(res.status).toBe(400)
  })

  it("403s a caller who cannot manage the group", async () => {
    vi.mocked(canManageGroup).mockResolvedValue(false)
    const { db } = makeDb()
    vi.mocked(getDb).mockResolvedValue(db as never)
    expect((await POST(postReq({ name: "X" }), { params })).status).toBe(403)
  })
})

describe("roles PATCH", () => {
  it("renames via a positional update so sibling roles are untouched", async () => {
    const { db, updates } = makeDb()
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await PATCH(patchReq({ roleId: "r1", name: "Distance" }), { params })
    expect(res.status).toBe(200)

    expect(updates[0].filter["roles.id"]).toBe("r1")
    expect(updates[0].update).toEqual({ $set: { "roles.$.name": "Distance" } })
  })

  it("404s when no role matches", async () => {
    const { db } = makeDb({ matchedCount: 0 })
    vi.mocked(getDb).mockResolvedValue(db as never)
    const res = await PATCH(patchReq({ roleId: "missing", name: "X" }), { params })
    expect(res.status).toBe(404)
  })
})

describe("roles DELETE", () => {
  it("removes the single element with $pull", async () => {
    const { db, updates } = makeDb()
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await DELETE(deleteReq("?roleId=r1"), { params })
    expect(res.status).toBe(200)

    expect(updates[0].update).toEqual({ $pull: { roles: { id: "r1" } } })
  })

  it("404s when the role was not present", async () => {
    const { db } = makeDb({ modifiedCount: 0 })
    vi.mocked(getDb).mockResolvedValue(db as never)
    expect((await DELETE(deleteReq("?roleId=gone"), { params })).status).toBe(404)
  })

  it("requires the roleId query param", async () => {
    const { db } = makeDb()
    vi.mocked(getDb).mockResolvedValue(db as never)
    expect((await DELETE(deleteReq(""), { params })).status).toBe(400)
  })
})
