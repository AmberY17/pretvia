import { describe, it, expect, vi, beforeEach } from "vitest"

describe("isTestAccount", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("returns false for empty email", async () => {
    vi.stubEnv("TEST_ACCOUNT_EMAILS", "test@example.com")
    const { isTestAccount } = await import("@/lib/auth-config")
    expect(isTestAccount("")).toBe(false)
  })

  it("returns true for test account email", async () => {
    vi.stubEnv("TEST_ACCOUNT_EMAILS", "test@example.com,other@example.com")
    const { isTestAccount } = await import("@/lib/auth-config")
    expect(isTestAccount("test@example.com")).toBe(true)
  })

  it("is case-insensitive", async () => {
    vi.stubEnv("TEST_ACCOUNT_EMAILS", "Test@Example.com")
    const { isTestAccount } = await import("@/lib/auth-config")
    expect(isTestAccount("test@example.com")).toBe(true)
  })

  it("returns false for non-test email", async () => {
    vi.stubEnv("TEST_ACCOUNT_EMAILS", "test@example.com")
    const { isTestAccount } = await import("@/lib/auth-config")
    expect(isTestAccount("other@example.com")).toBe(false)
  })

  it("handles empty env var", async () => {
    vi.stubEnv("TEST_ACCOUNT_EMAILS", "")
    const { isTestAccount } = await import("@/lib/auth-config")
    expect(isTestAccount("test@example.com")).toBe(false)
  })
})
