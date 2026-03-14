import { describe, it, expect } from "vitest"
import { safeObjectId } from "@/lib/objectid"

describe("safeObjectId", () => {
  it("returns ObjectId for valid 24-char hex string", () => {
    const result = safeObjectId("507f1f77bcf86cd799439011")
    expect(result).not.toBeNull()
    expect(result!.toString()).toBe("507f1f77bcf86cd799439011")
  })

  it("returns null for null input", () => {
    expect(safeObjectId(null)).toBeNull()
  })

  it("returns null for undefined input", () => {
    expect(safeObjectId(undefined)).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(safeObjectId("")).toBeNull()
  })

  it("returns null for wrong length", () => {
    expect(safeObjectId("abc123")).toBeNull()
  })

  it("returns null for non-hex characters", () => {
    expect(safeObjectId("507f1f77bcf86cd79943901g")).toBeNull()
  })

  it("trims whitespace and validates", () => {
    const result = safeObjectId("  507f1f77bcf86cd799439011  ")
    expect(result).not.toBeNull()
    expect(result!.toString()).toBe("507f1f77bcf86cd799439011")
  })

  it("handles case-insensitive hex", () => {
    const result = safeObjectId("507F1F77BCF86CD799439011")
    expect(result).not.toBeNull()
  })
})
