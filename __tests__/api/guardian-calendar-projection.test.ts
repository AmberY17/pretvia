import { describe, it, expect, vi, beforeEach } from "vitest"

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

import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { GET } from "@/app/api/guardian/calendar/route"

/**
 * Guardians are intended to see their athlete's log *emoji*, including for logs the
 * athlete marked `visibility: "private"` — that is a product decision, not an
 * oversight (see CLAUDE.md, API-audit finding 4). What must never reach a guardian
 * is the log *notes*.
 *
 * The projection is the sole enforcement point: there is no visibility filter on
 * these queries by design, so if a refactor widens the projection, private notes
 * leak silently. These tests pin it.
 */

const PRIVATE_LOG = {
  _id: { toString: () => "log1" },
  userId: "athlete1",
  groupId: "group1",
  emoji: "😤",
  notes: "SECRET_PRIVATE_NOTES",
  visibility: "private",
  timestamp: new Date("2026-08-10T12:00:00.000Z"),
}

/** Records the projection passed to each collection's find() chain. */
function makeDb() {
  const projections: Record<string, unknown[]> = {}

  const cursor = (name: string, docs: unknown[]) => ({
    project: (p: unknown) => {
      ;(projections[name] ??= []).push(p)
      return cursor(name, docs)
    },
    toArray: () => Promise.resolve(docs),
  })

  const docsFor = (name: string): unknown[] => {
    if (name === "guardianLinks") return [{ athleteId: "athlete1" }]
    if (name === "users")
      return [
        {
          _id: { toString: () => "athlete1" },
          displayName: "Athlete One",
          groupIds: ["group1"],
          trainingSlots: [],
        },
      ]
    if (name === "groups") return [{ _id: { toString: () => "group1" }, name: "Group One" }]
    if (name === "logs") return [PRIVATE_LOG]
    return []
  }

  const db = {
    collection: (name: string) => ({
      findOne: () =>
        Promise.resolve(
          name === "users" ? { _id: { toString: () => "guardian1" }, role: "guardian" } : null,
        ),
      find: () => cursor(name, docsFor(name)),
    }),
  }

  return { db, projections }
}

function makeReq(qs = "") {
  return new Request(`http://localhost/api/guardian/calendar${qs}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue({ userId: "guardian1" } as never)
})

describe("GET /api/guardian/calendar — log projection", () => {
  it("never projects notes on the default (per-athlete) path", async () => {
    const { db, projections } = makeDb()
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await GET(makeReq())
    expect(res.status).toBe(200)

    const logProjections = projections.logs ?? []
    expect(logProjections.length).toBeGreaterThan(0)
    for (const p of logProjections) {
      expect(p).not.toHaveProperty("notes")
      expect(p).toHaveProperty("emoji")
    }
  })

  it("never projects notes on the pairs path", async () => {
    const { db, projections } = makeDb()
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await GET(makeReq("?pairs=athlete1:group1&month=2026-08"))
    expect(res.status).toBe(200)

    const logProjections = projections.logs ?? []
    expect(logProjections.length).toBeGreaterThan(0)
    for (const p of logProjections) {
      expect(p).not.toHaveProperty("notes")
      expect(p).toHaveProperty("emoji")
    }
  })

  it("does not leak notes into the response body even if a doc carries them", async () => {
    // Behaviour-level backstop: the mock returns a doc *with* notes attached, as
    // would happen if the projection were dropped. The response must still be clean.
    const { db } = makeDb()
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await GET(makeReq())
    const body = JSON.stringify(await res.json())

    expect(body).not.toContain("SECRET_PRIVATE_NOTES")
    expect(body).not.toContain("notes")
  })

  it("still surfaces the emoji of a private log — guardians are meant to see it", async () => {
    const { db } = makeDb()
    vi.mocked(getDb).mockResolvedValue(db as never)

    const res = await GET(makeReq())
    const body = JSON.stringify(await res.json())

    expect(body).toContain("😤")
  })

  it("returns 403 for a non-guardian", async () => {
    const { db } = makeDb()
    vi.mocked(getDb).mockResolvedValue({
      ...db,
      collection: (name: string) => ({
        ...db.collection(name),
        findOne: () => Promise.resolve({ _id: "u1", role: "athlete" }),
      }),
    } as never)

    const res = await GET(makeReq())
    expect(res.status).toBe(403)
  })

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })
})
