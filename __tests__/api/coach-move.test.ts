import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }))
vi.mock("@/lib/objectid", () => ({
  safeObjectId: vi.fn((id: string) =>
    id && id !== "bad" ? { toString: () => id } : null,
  ),
}))

const addCoachToGroup = vi.fn()
const removeUserFromGroup = vi.fn()
vi.mock("@/lib/group-actions", () => ({
  addCoachToGroup: (...a: unknown[]) => addCoachToGroup(...a),
  removeUserFromGroup: (...a: unknown[]) => removeUserFromGroup(...a),
}))

const startSession = vi.fn()
vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
  default: Promise.resolve({ startSession: () => startSession() }),
}))

import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { PATCH, DELETE } from "@/app/api/groups/[groupId]/coaches/[coachId]/route"

const HEAD = "head1"
const COACH = "coach1"
const SOURCE = "sourceGroup"
const TARGET = "targetGroup"

/** `headOf` lists the group ids the session user head-coaches. */
function makeDb(headOf: string[], missing: string[] = []) {
  return {
    collection: () => ({
      findOne: (filter: { _id: { toString(): string } }) => {
        const id = filter._id.toString()
        if (missing.includes(id)) return Promise.resolve(null)
        return Promise.resolve({
          _id: { toString: () => id },
          headCoachId: headOf.includes(id) ? HEAD : "someoneElse",
        })
      },
    }),
  }
}

const req = (body: unknown) =>
  new Request("http://localhost/x", { method: "PATCH", body: JSON.stringify(body) })

const params = Promise.resolve({ groupId: SOURCE, coachId: COACH })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue({ userId: HEAD } as never)
  startSession.mockReturnValue({
    withTransaction: async (fn: () => Promise<void>) => fn(),
    endSession: vi.fn().mockResolvedValue(undefined),
  })
})

describe("PATCH coach move — authorization", () => {
  it("401s when unauthenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    vi.mocked(getDb).mockResolvedValue(makeDb([SOURCE, TARGET]) as never)
    expect((await PATCH(req({ targetGroupId: TARGET }), { params })).status).toBe(401)
  })

  it("403s when the caller does not head-coach the source group", async () => {
    vi.mocked(getDb).mockResolvedValue(makeDb([TARGET]) as never)
    expect((await PATCH(req({ targetGroupId: TARGET }), { params })).status).toBe(403)
    expect(removeUserFromGroup).not.toHaveBeenCalled()
  })

  it("403s when the caller does not head-coach the destination group", async () => {
    // Otherwise this would be a way to push a coach into someone else's group.
    vi.mocked(getDb).mockResolvedValue(makeDb([SOURCE]) as never)
    const res = await PATCH(req({ targetGroupId: TARGET }), { params })
    expect(res.status).toBe(403)
    expect(removeUserFromGroup).not.toHaveBeenCalled()
  })

  it("404s when the destination group does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(makeDb([SOURCE, TARGET], [TARGET]) as never)
    expect((await PATCH(req({ targetGroupId: TARGET }), { params })).status).toBe(404)
  })
})

describe("PATCH coach move — validation", () => {
  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue(makeDb([SOURCE, TARGET]) as never)
  })

  it("requires targetGroupId", async () => {
    expect((await PATCH(req({}), { params })).status).toBe(400)
  })

  it("rejects moving a coach into the group they are already in", async () => {
    expect((await PATCH(req({ targetGroupId: SOURCE }), { params })).status).toBe(400)
  })

  it("rejects moving yourself", async () => {
    const res = await PATCH(req({ targetGroupId: TARGET }), {
      params: Promise.resolve({ groupId: SOURCE, coachId: HEAD }),
    })
    expect(res.status).toBe(400)
  })
})

describe("PATCH coach move — atomicity", () => {
  it("removes then adds, inside a transaction", async () => {
    // The UI previously did DELETE-then-POST; a failed POST left the coach in
    // neither group with no compensating re-add.
    vi.mocked(getDb).mockResolvedValue(makeDb([SOURCE, TARGET]) as never)

    const res = await PATCH(req({ targetGroupId: TARGET }), { params })
    expect(res.status).toBe(200)

    expect(removeUserFromGroup).toHaveBeenCalledWith(
      expect.anything(),
      COACH,
      SOURCE,
      expect.anything(),
    )
    expect(addCoachToGroup).toHaveBeenCalledWith(
      expect.anything(),
      COACH,
      TARGET,
      expect.anything(),
    )
  })

  it("falls back to unwrapped writes only when transactions are unsupported", async () => {
    startSession.mockReturnValue({
      withTransaction: () => {
        throw new Error("Transaction numbers are only allowed on a replica set member or mongos")
      },
      endSession: vi.fn().mockResolvedValue(undefined),
    })
    vi.mocked(getDb).mockResolvedValue(makeDb([SOURCE, TARGET]) as never)

    const res = await PATCH(req({ targetGroupId: TARGET }), { params })
    expect(res.status).toBe(200)
    expect(addCoachToGroup).toHaveBeenCalled()
  })

  it("500s on a genuine failure rather than replaying the move", async () => {
    startSession.mockReturnValue({
      withTransaction: () => {
        throw new Error("WriteConflict")
      },
      endSession: vi.fn().mockResolvedValue(undefined),
    })
    vi.mocked(getDb).mockResolvedValue(makeDb([SOURCE, TARGET]) as never)

    const res = await PATCH(req({ targetGroupId: TARGET }), { params })
    expect(res.status).toBe(500)
    expect(addCoachToGroup).not.toHaveBeenCalled()
  })
})

describe("DELETE coach", () => {
  it("routes removal through the shared three-store helper", async () => {
    vi.mocked(getDb).mockResolvedValue(makeDb([SOURCE]) as never)

    const res = await DELETE(new Request("http://localhost/x"), { params })
    expect(res.status).toBe(200)
    expect(removeUserFromGroup).toHaveBeenCalledWith(
      expect.anything(),
      COACH,
      SOURCE,
      expect.anything(),
    )
  })

  it("still refuses to remove yourself", async () => {
    vi.mocked(getDb).mockResolvedValue(makeDb([SOURCE]) as never)
    const res = await DELETE(new Request("http://localhost/x"), {
      params: Promise.resolve({ groupId: SOURCE, coachId: HEAD }),
    })
    expect(res.status).toBe(400)
    expect(removeUserFromGroup).not.toHaveBeenCalled()
  })
})
