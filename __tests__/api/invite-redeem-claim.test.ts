import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextResponse } from "next/server"

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }))
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }))
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

const handleAthleteInvite = vi.fn()
vi.mock("@/app/api/invites/[token]/redeem/type-handlers", () => ({
  handleUnder13ParentInvite: vi.fn(),
  handleAthleteInvite: (...args: unknown[]) => handleAthleteInvite(...args),
  handleParentInvite: vi.fn(),
  handleCoachInvite: vi.fn(),
}))

import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { POST } from "@/app/api/invites/[token]/redeem/route"

const TOKEN = "invite-token"

/**
 * In-memory invites collection. `claimedAt` is the reservation marker: the route
 * sets it to claim, unsets it to release, and the type handler deletes the whole
 * document on success.
 */
function makeDb(invite: Record<string, unknown> | null) {
  const store = { invite: invite ? { ...invite } : null }
  const updates: unknown[] = []

  const invites = {
    findOne: () => Promise.resolve(store.invite),
    findOneAndUpdate: (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      const doc = store.invite
      if (!doc) return Promise.resolve(null)
      // Emulate the $or claimable predicate.
      const or = filter.$or as { claimedAt: unknown }[]
      const claimedAt = doc.claimedAt as Date | undefined
      const staleCutoff = (or[1].claimedAt as { $lt: Date }).$lt
      const claimable = claimedAt === undefined || claimedAt < staleCutoff
      if (!claimable) return Promise.resolve(null)
      Object.assign(doc, (update.$set as object) ?? {})
      return Promise.resolve({ ...doc })
    },
    updateOne: (_f: unknown, update: Record<string, unknown>) => {
      updates.push(update)
      if (update.$unset && store.invite) delete store.invite.claimedAt
      return Promise.resolve({ modifiedCount: 1 })
    },
    deleteOne: () => {
      store.invite = null
      return Promise.resolve({ deletedCount: 1 })
    },
  }

  const db = {
    collection: (name: string) => {
      if (name === "invites") return invites
      if (name === "groups")
        return { findOne: () => Promise.resolve({ _id: "g1", name: "Group One" }) }
      return { findOne: () => Promise.resolve(null) }
    },
  }

  return { db, store, updates }
}

const makeReq = () =>
  new Request("http://localhost/api/invites/x/redeem", {
    method: "POST",
    body: JSON.stringify({ createAccount: true, password: "short" }),
    headers: { "content-type": "application/json" },
  })

const params = Promise.resolve({ token: TOKEN })

function validInvite(overrides: Record<string, unknown> = {}) {
  return {
    token: TOKEN,
    type: "athlete",
    email: "athlete@example.com",
    groupId: "g1",
    expiresAt: new Date(Date.now() + 86_400_000),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue(null)
})

describe("POST /api/invites/[token]/redeem — invite survives a failed redeem", () => {
  it("keeps the invite usable when the handler rejects the body", async () => {
    // The whole point of API-7: a mistyped password must not destroy the link.
    handleAthleteInvite.mockResolvedValue(
      NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 }),
    )
    const { db, store } = makeDb(validInvite())
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await POST(makeReq(), { params })
    expect(res.status).toBe(400)

    expect(store.invite).not.toBeNull()
    // ...and the reservation is released, so an immediate retry can claim it again.
    expect(store.invite?.claimedAt).toBeUndefined()
  })

  it("allows an immediate retry to succeed after a failure", async () => {
    const { db, store } = makeDb(validInvite())
    vi.mocked(getDb).mockResolvedValue(db as never)

    handleAthleteInvite.mockResolvedValue(
      NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 }),
    )
    expect((await POST(makeReq(), { params })).status).toBe(400)

    handleAthleteInvite.mockImplementation(async (db: { collection: (n: string) => { deleteOne: () => unknown } }) => {
      await db.collection("invites").deleteOne()
      return NextResponse.json({ success: true })
    })
    const second = await POST(makeReq(), { params })
    expect(second.status).toBe(200)
    expect(store.invite).toBeNull()
  })

  it("releases the reservation when the handler throws", async () => {
    handleAthleteInvite.mockRejectedValue(new Error("boom"))
    const { db, store } = makeDb(validInvite())
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await POST(makeReq(), { params })
    expect(res.status).toBe(500)
    expect(store.invite).not.toBeNull()
    expect(store.invite?.claimedAt).toBeUndefined()
  })

  it("releases the reservation when the group is missing", async () => {
    const { db, store } = makeDb(validInvite())
    const noGroup = {
      collection: (name: string) =>
        name === "groups"
          ? { findOne: () => Promise.resolve(null) }
          : (db.collection(name) as never),
    }
    vi.mocked(getDb).mockResolvedValue(noGroup as never)

    const res = await POST(makeReq(), { params })
    expect(res.status).toBe(404)
    expect(store.invite?.claimedAt).toBeUndefined()
  })
})

describe("POST /api/invites/[token]/redeem — consumption and concurrency", () => {
  it("consumes the invite on success", async () => {
    handleAthleteInvite.mockImplementation(async (db: { collection: (n: string) => { deleteOne: () => unknown } }) => {
      await db.collection("invites").deleteOne()
      return NextResponse.json({ success: true })
    })
    const { db, store } = makeDb(validInvite())
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await POST(makeReq(), { params })
    expect(res.status).toBe(200)
    expect(store.invite).toBeNull()
  })

  it("rejects a second concurrent redeem with 409 while one is in flight", async () => {
    const { db, store } = makeDb(validInvite({ claimedAt: new Date() }))
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await POST(makeReq(), { params })
    expect(res.status).toBe(409)
    // The in-flight redeem still owns it.
    expect(store.invite?.claimedAt).toBeDefined()
    expect(handleAthleteInvite).not.toHaveBeenCalled()
  })

  it("reclaims a reservation left behind by a crashed request", async () => {
    handleAthleteInvite.mockResolvedValue(NextResponse.json({ success: true }))
    const stale = new Date(Date.now() - 10 * 60 * 1000)
    const { db } = makeDb(validInvite({ claimedAt: stale }))
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await POST(makeReq(), { params })
    expect(res.status).toBe(200)
    expect(handleAthleteInvite).toHaveBeenCalled()
  })
})

describe("POST /api/invites/[token]/redeem — pre-claim guards", () => {
  it("404s an unknown token without claiming anything", async () => {
    const { db } = makeDb(null)
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await POST(makeReq(), { params })
    expect(res.status).toBe(404)
    expect(handleAthleteInvite).not.toHaveBeenCalled()
  })

  it("410s and removes an expired invite", async () => {
    const { db, store } = makeDb(validInvite({ expiresAt: new Date(Date.now() - 1000) }))
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await POST(makeReq(), { params })
    expect(res.status).toBe(410)
    expect(store.invite).toBeNull()
  })
})
