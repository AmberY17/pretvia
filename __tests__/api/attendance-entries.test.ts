import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }))
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }))
vi.mock("@/lib/objectid", () => ({
  safeObjectId: vi.fn((id: string) => (id === "bad" ? null : { toString: () => id })),
}))
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

import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { POST } from "@/app/api/attendance/route"

type Upsert = { filter: unknown; update: Record<string, unknown>; options: unknown }

/** `memberIds` are the users who actually belong to the coach's group. */
function makeDb(memberIds: string[]) {
  const upserts: Upsert[] = []
  const inserts: unknown[] = []

  const cursor = (docs: unknown[]) => ({
    project: () => cursor(docs),
    sort: () => cursor(docs),
    toArray: () => Promise.resolve(docs),
  })

  const db = {
    collection: (name: string) => ({
      findOne: () => {
        if (name === "users")
          return Promise.resolve({ _id: "coach1", role: "coach", activeGroupId: "g1" })
        if (name === "checkins")
          return Promise.resolve({ _id: "c1", sessionDate: new Date("2026-08-10") })
        return Promise.resolve(null)
      },
      find: () => cursor(memberIds.map((id) => ({ _id: { toString: () => id } }))),
      findOneAndUpdate: (filter: unknown, update: Record<string, unknown>, options: unknown) => {
        upserts.push({ filter, update, options })
        return Promise.resolve({ _id: { toString: () => "att1" } })
      },
      insertOne: (doc: unknown) => {
        inserts.push(doc)
        return Promise.resolve({ insertedId: { toString: () => "att1" } })
      },
    }),
  }
  return { db, upserts, inserts }
}

const makeReq = (body: unknown) =>
  new Request("http://localhost/api/attendance", {
    method: "POST",
    body: JSON.stringify(body),
  })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue({ userId: "coach1" } as never)
})

describe("POST /api/attendance — entry validation", () => {
  it("drops entries for users who are not in the group", async () => {
    // Without this a coach could write attendance rows against any userId in the
    // system, including athletes in groups they have nothing to do with.
    const { db, upserts } = makeDb(["athlete1"])
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await POST(
      makeReq({
        checkinId: "c1",
        entries: [
          { userId: "athlete1", status: "present" },
          { userId: "outsider", status: "present" },
        ],
      }),
    )

    expect(res.status).toBe(200)
    const entries = (await res.json()).attendance.entries
    expect(entries).toEqual([{ userId: "athlete1", status: "present" }])
    expect(JSON.stringify(upserts)).not.toContain("outsider")
  })

  it("rejects an unrecognized status", async () => {
    const { db } = makeDb(["athlete1"])
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await POST(
      makeReq({ checkinId: "c1", entries: [{ userId: "athlete1", status: "maybe" }] }),
    )
    expect(res.status).toBe(400)
    expect(typeof (await res.json()).error).toBe("string")
  })

  it("rejects an unbounded entries array", async () => {
    const { db } = makeDb(["athlete1"])
    vi.mocked(getDb).mockResolvedValue(db as never)

    const huge = Array(501).fill({ userId: "athlete1", status: "present" })
    const res = await POST(makeReq({ checkinId: "c1", entries: huge }))
    expect(res.status).toBe(400)
  })

  it("still requires checkinId and an array", async () => {
    const { db } = makeDb(["athlete1"])
    vi.mocked(getDb).mockResolvedValue(db as never)
    expect((await POST(makeReq({ entries: [] }))).status).toBe(400)
    expect((await POST(makeReq({ checkinId: "c1", entries: "nope" }))).status).toBe(400)
  })
})

describe("POST /api/attendance — atomic save", () => {
  it("writes with a single upsert rather than findOne-then-insert", async () => {
    const { db, upserts, inserts } = makeDb(["athlete1"])
    vi.mocked(getDb).mockResolvedValue(db as never)

    await POST(makeReq({ checkinId: "c1", entries: [{ userId: "athlete1", status: "present" }] }))

    expect(upserts).toHaveLength(1)
    expect(upserts[0].options).toMatchObject({ upsert: true })
    expect(upserts[0].filter).toEqual({ checkinId: "c1", groupId: "g1" })
    // The old code path inserted directly, which could produce a second roll.
    expect(inserts).toHaveLength(0)
  })

  it("sets createdAt only on insert so a re-save keeps the original", async () => {
    const { db, upserts } = makeDb(["athlete1"])
    vi.mocked(getDb).mockResolvedValue(db as never)

    await POST(makeReq({ checkinId: "c1", entries: [] }))
    expect(upserts[0].update.$setOnInsert).toHaveProperty("createdAt")
    expect(upserts[0].update.$set).not.toHaveProperty("createdAt")
  })

  it("403s a non-coach", async () => {
    const { db } = makeDb([])
    const athleteDb = {
      collection: (name: string) => ({
        ...db.collection(name),
        findOne: () => Promise.resolve({ _id: "u1", role: "athlete" }),
      }),
    }
    vi.mocked(getDb).mockResolvedValue(athleteDb as never)

    const res = await POST(makeReq({ checkinId: "c1", entries: [] }))
    expect(res.status).toBe(403)
  })
})
