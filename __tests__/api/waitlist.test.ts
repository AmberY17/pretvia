import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }))

import { getDb } from "@/lib/mongodb"
import { POST } from "@/app/api/waitlist/route"

function makeReq(body: object) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeMockDb(findOneResult: unknown, insertShouldThrow?: { code: number }) {
  const findOne = vi.fn().mockResolvedValue(findOneResult)
  const insertOne = insertShouldThrow
    ? vi.fn().mockRejectedValue(insertShouldThrow)
    : vi.fn().mockResolvedValue({ insertedId: "abc" })
  return {
    db: { collection: vi.fn().mockReturnValue({ findOne, insertOne }) },
    findOne,
    insertOne,
  }
}

const validBody = {
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com",
  clubName: "Riverside FC",
  groups: [{ ageGroups: ["U12", "U14"], level: "Intermediate" }],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/waitlist", () => {
  it("returns 400 when firstName is missing", async () => {
    const res = await POST(makeReq({ lastName: "Smith", email: "test@example.com", clubName: "FC", groups: [{ ageGroups: ["U12"], level: "" }] }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeReq({ firstName: "Jane", lastName: "Smith", clubName: "FC", groups: [{ ageGroups: ["U12"], level: "" }] }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it("returns 400 when groups have no age groups", async () => {
    const { db } = makeMockDb(null)
    vi.mocked(getDb).mockResolvedValue(db as any)

    const res = await POST(makeReq({ ...validBody, groups: [{ ageGroups: [], level: "" }] }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it("returns 200 and calls insertOne with correct fields on valid submission", async () => {
    const { db, insertOne } = makeMockDb(null)
    vi.mocked(getDb).mockResolvedValue(db as any)

    const res = await POST(makeReq({ ...validBody, firstName: "  Jane  ", lastName: "  Smith  ", email: "  Jane@Example.COM  " }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        email: "jane@example.com",
        name: "Jane Smith",
        firstName: "Jane",
        lastName: "Smith",
        clubName: "Riverside FC",
      })
    )
  })

  it("returns 409 when app-level findOne returns existing entry", async () => {
    const { db } = makeMockDb({ email: "jane@example.com" })
    vi.mocked(getDb).mockResolvedValue(db as any)

    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/already on the waitlist/i)
  })

  it("returns 409 on MongoDB duplicate key error (code 11000)", async () => {
    const { db } = makeMockDb(null, { code: 11000 })
    vi.mocked(getDb).mockResolvedValue(db as any)

    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/already on the waitlist/i)
  })
})
