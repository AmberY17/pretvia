/**
 * One-time migration: renames `groupId` → `activeGroupId` on all user documents.
 *
 * Run AFTER deploying the code change:
 *   pnpm tsx scripts/migrate-active-group-id.ts
 *
 * Safe to run multiple times — only touches documents where `groupId` still exists.
 */

import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { MongoClient } from "mongodb"

for (const file of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), file)
  if (existsSync(path)) {
    const content = readFileSync(path, "utf8")
    for (const line of content.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const val = match[2].trim().replace(/^[\"']|[\"']$/g, "")
        if (!process.env[key]) process.env[key] = val
      }
    }
    break
  }
}

async function migrate() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI is required")
    process.exit(1)
  }

  const client = new MongoClient(uri, { autoSelectFamily: false })
  await client.connect()
  const db = client.db("pretvia")

  const result = await db.collection("users").updateMany(
    { groupId: { $exists: true } },
    [
      { $set: { activeGroupId: "$groupId" } },
      { $unset: "groupId" },
    ]
  )

  console.log(`Migration complete: ${result.modifiedCount} user document(s) updated.`)
  await client.close()
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
