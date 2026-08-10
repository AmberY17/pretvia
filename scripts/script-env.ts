/**
 * Shared bootstrap for standalone scripts (migrations, audits).
 *
 * Scripts run outside Next.js, so they load .env.local / .env themselves and
 * connect with their own MongoClient rather than going through lib/mongodb.ts
 * (which triggers the index bootstrap and expects the app's runtime).
 */

import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { MongoClient } from "mongodb"

export function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file)
    if (!existsSync(path)) continue
    const content = readFileSync(path, "utf8")
    for (const line of content.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const val = match[2].trim().replace(/^["']|["']$/g, "")
        if (!process.env[key]) process.env[key] = val
      }
    }
    return
  }
}

/** Connect to the same database the app uses. Caller is responsible for close(). */
export async function connect(): Promise<MongoClient> {
  loadEnv()
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI is required")
    process.exit(1)
  }
  const client = new MongoClient(uri, { autoSelectFamily: false })
  await client.connect()
  return client
}
