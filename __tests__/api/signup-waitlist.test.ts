import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }))
vi.mock("@/lib/auth-config", () => ({ isTestAccount: vi.fn() }))
vi.mock("@/lib/auth", () => ({ createSession: vi.fn() }))
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed") } }))
vi.mock("@/lib/resend", () => ({ sendVerificationEmail: vi.fn().mockResolvedValue({ ok: true }) }))
vi.mock("@/flags", () => ({ betaFlag: vi.fn().mockResolvedValue(true) }))
vi.mock("@/flags", () => ({ betaFlag: vi.fn().mockResolvedValue(true) }))

import { getDb } from "@/lib/mongodb"
import { isTestAccount } from "@/lib/auth-config"
import { createSession } from "@/lib/auth"
import { POST } from "@/app/api/auth/signup/route"

function makeReq(body: object) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const BASE_COACH = {
  email: "newcoach@example.com",
  password: "password123",
  firstName: "New",
  lastName: "Coach",
  role: "coach",
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isTestAccount).mockReturnValue(false)
})

describe("POST /api/auth/signup — waitlist gating", () => {
  it("returns 403 when coach signs up without a waitlistToken", async () => {
    const db = { collection: vi.fn().mockReturnValue({ findOne: vi.fn().mockResolvedValue(null) }) }
    vi.mocked(getDb).mockResolvedValue(db as any)

    const res = await POST(makeReq(BASE_COACH))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Coach sign-ups require a waitlist invite token.")
  })

  it("returns 403 when token not found in waitlist", async () => {
    const usersCollection = { findOne: vi.fn().mockResolvedValue(null) }
    const waitlistCollection = { findOne: vi.fn().mockResolvedValue(null) }
    const db = {
      collection: vi.fn((name: string) => {
        if (name === "waitlist") return waitlistCollection
        return usersCollection
      }),
    }
    vi.mocked(getDb).mockResolvedValue(db as any)

    const res = await POST(makeReq({ ...BASE_COACH, waitlistToken: "bad-token" }))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Invalid or expired invite token.")
  })

  it("returns 403 when invite has already been used", async () => {
    const usersCollection = { findOne: vi.fn().mockResolvedValue(null) }
    const waitlistCollection = {
      findOne: vi.fn().mockResolvedValue({
        _id: "wl1",
        status: "approved",
        inviteToken: "token",
        usedAt: new Date(),
        inviteExpiresAt: new Date(Date.now() + 1000000),
      }),
    }
    const db = {
      collection: vi.fn((name: string) => {
        if (name === "waitlist") return waitlistCollection
        return usersCollection
      }),
    }
    vi.mocked(getDb).mockResolvedValue(db as any)

    const res = await POST(makeReq({ ...BASE_COACH, waitlistToken: "token" }))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("This invite has already been used.")
  })

  it("returns 403 when invite link has expired", async () => {
    const usersCollection = { findOne: vi.fn().mockResolvedValue(null) }
    const waitlistCollection = {
      findOne: vi.fn().mockResolvedValue({
        _id: "wl1",
        status: "approved",
        inviteToken: "token",
        usedAt: null,
        inviteExpiresAt: new Date(Date.now() - 1000),
      }),
    }
    const db = {
      collection: vi.fn((name: string) => {
        if (name === "waitlist") return waitlistCollection
        return usersCollection
      }),
    }
    vi.mocked(getDb).mockResolvedValue(db as any)

    const res = await POST(makeReq({ ...BASE_COACH, waitlistToken: "token" }))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Your invite link has expired.")
  })

  it("returns 200 for coach when isTestAccount is true (bypasses waitlist gate)", async () => {
    vi.mocked(isTestAccount).mockReturnValue(true)
    const insertResult = { insertedId: { toString: () => "user123" } }
    const usersCollection = {
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue(insertResult),
    }
    const db = { collection: vi.fn().mockReturnValue(usersCollection) }
    vi.mocked(getDb).mockResolvedValue(db as any)
    vi.mocked(createSession).mockResolvedValue(undefined as any)

    const res = await POST(makeReq(BASE_COACH))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(createSession).toHaveBeenCalled()
  })
})
