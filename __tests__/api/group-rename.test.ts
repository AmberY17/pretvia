import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }))
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }))
vi.mock("@/lib/objectid", () => ({
  safeObjectId: vi.fn((id: string) => (id === "bad" ? null : { toString: () => id })),
}))

import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { PATCH } from "@/app/api/groups/[groupId]/route"

function makeReq(body: object) {
  return new Request("http://localhost/api/groups/group1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeParams(groupId = "group1") {
  return { params: Promise.resolve({ groupId }) }
}

function makeDb(groupDoc: Record<string, unknown> | null) {
  const updateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 })
  return {
    collection: vi.fn().mockReturnValue({
      findOne: vi.fn().mockResolvedValue(groupDoc),
      updateOne,
    }),
    _updateOne: updateOne,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("PATCH /api/groups/[groupId]", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const res = await PATCH(makeReq({ name: "New Name" }), makeParams())
    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid groupId", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "user1" } as never)
    vi.mocked(getDb).mockResolvedValue({} as never)

    const res = await PATCH(makeReq({ name: "New Name" }), makeParams("bad"))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: "Invalid ID" })
  })

  it("returns 400 when name is too short", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "user1" } as never)

    const res = await PATCH(makeReq({ name: "A" }), makeParams())
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("at least 2") })
  })

  it("returns 400 when name is missing", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "user1" } as never)

    const res = await PATCH(makeReq({}), makeParams())
    expect(res.status).toBe(400)
  })

  it("returns 404 when group not found", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "user1" } as never)
    vi.mocked(getDb).mockResolvedValue(makeDb(null) as never)

    const res = await PATCH(makeReq({ name: "New Name" }), makeParams())
    expect(res.status).toBe(404)
  })

  it("returns 403 when caller is not head coach", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "user1" } as never)
    vi.mocked(getDb).mockResolvedValue(
      makeDb({ _id: "group1", headCoachId: { toString: () => "other-user" }, code: "ABC" }) as never
    )

    const res = await PATCH(makeReq({ name: "New Name" }), makeParams())
    expect(res.status).toBe(403)
  })

  it("renames the group and returns new name when head coach", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "user1" } as never)
    const db = makeDb({ _id: "group1", headCoachId: { toString: () => "user1" }, code: "ABC" })
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await PATCH(makeReq({ name: "  Updated Name  " }), makeParams())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.group.name).toBe("Updated Name")
    expect(db._updateOne).toHaveBeenCalledWith(
      expect.anything(),
      { $set: { name: "Updated Name" } }
    )
  })
})
