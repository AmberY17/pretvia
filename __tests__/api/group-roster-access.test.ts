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
import { GET } from "@/app/api/groups/route"

function makeReq(groupId = "group1") {
  return new Request(`http://localhost/api/groups?groupId=${groupId}`)
}

const MEMBER = {
  _id: { toString: () => "athlete1" },
  displayName: "Athlete One",
  email: "athlete@example.com",
  role: "athlete",
  dateOfBirth: "2015-01-01",
}

/**
 * `group` is the groups doc, `user` the caller's users doc. The members query
 * resolves to a single athlete so we can assert whether the roster leaked.
 */
function makeDb(group: Record<string, unknown> | null, user: Record<string, unknown> | null) {
  const cursor = (docs: unknown[]) => ({
    project: () => cursor(docs),
    toArray: vi.fn().mockResolvedValue(docs),
  })
  return {
    collection: vi.fn((name: string) => {
      if (name === "groups") return { findOne: vi.fn().mockResolvedValue(group) }
      if (name === "users")
        return {
          findOne: vi.fn().mockResolvedValue(user),
          find: vi.fn(() => cursor([MEMBER])),
        }
      return { findOne: vi.fn().mockResolvedValue(null), find: vi.fn(() => cursor([])) }
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/groups?groupId= — roster access", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it("returns 403 for an authenticated non-member", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "outsider" } as never)
    vi.mocked(getDb).mockResolvedValue(
      makeDb(
        { _id: "group1", headCoachId: "coach1", coachIds: ["coach1"] },
        { _id: "outsider", role: "athlete", groupIds: ["someOtherGroup"] },
      ) as never,
    )

    const res = await GET(makeReq())
    expect(res.status).toBe(403)
    // The roster carries email + dateOfBirth — it must not be in the body.
    expect(JSON.stringify(await res.json())).not.toContain("athlete@example.com")
  })

  it("returns the roster to a member of the group", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "athlete1" } as never)
    vi.mocked(getDb).mockResolvedValue(
      makeDb(
        { _id: "group1", headCoachId: "coach1", coachIds: ["coach1"] },
        { _id: "athlete1", role: "athlete", groupIds: ["group1"] },
      ) as never,
    )

    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.members).toHaveLength(1)
  })

  it("returns the roster to a coach listed in coachIds but not in groupIds", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "coach1" } as never)
    vi.mocked(getDb).mockResolvedValue(
      makeDb(
        { _id: "group1", headCoachId: "other", coachIds: ["coach1"] },
        { _id: "coach1", role: "coach", groupIds: [] },
      ) as never,
    )

    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    expect((await res.json()).members).toHaveLength(1)
  })

  it("returns the roster to the head coach even when absent from coachIds", async () => {
    // groups.headCoachId is NOT guaranteed to appear in coachIds — see CLAUDE.md.
    vi.mocked(getSession).mockResolvedValue({ userId: "coach1" } as never)
    vi.mocked(getDb).mockResolvedValue(
      makeDb(
        { _id: "group1", headCoachId: { toString: () => "coach1" }, coachIds: [] },
        { _id: "coach1", role: "coach", groupIds: [] },
      ) as never,
    )

    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    expect((await res.json()).members).toHaveLength(1)
  })
})
