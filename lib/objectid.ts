import { ObjectId } from "mongodb"

/**
 * Parse a string into an ObjectId. Returns null if the string is not a valid 24-char hex ID.
 * Use this for user-supplied IDs (query params, body) to return 400 instead of 500 on invalid input.
 */
export function safeObjectId(id: string | null | undefined): ObjectId | null {
  if (id == null || typeof id !== "string") return null
  const trimmed = id.trim()
  if (trimmed.length !== 24 || !/^[a-f0-9]{24}$/i.test(trimmed)) return null
  try {
    return new ObjectId(trimmed)
  } catch {
    return null
  }
}
