/**
 * Read-only duplicate audit.
 *
 * Every unique index added in Phase 2 fails to build if the collection already
 * holds duplicates for its key, so run this first and resolve anything it
 * reports. It writes nothing.
 *
 *   pnpm tsx scripts/audit-duplicates.ts
 *   pnpm tsx scripts/audit-duplicates.ts --verbose   # list the offending ids
 *
 * Exit code is 1 when duplicates exist, so it can gate a deploy.
 */

import type { Db } from "mongodb"
import { connect } from "./script-env"

const verbose = process.argv.includes("--verbose")

interface Check {
  /** The unique index this check clears the way for. */
  index: string
  collection: string
  /** _id expression for the $group stage. */
  key: Record<string, unknown>
  /** Only consider documents matching this. */
  match?: Record<string, unknown>
  note: string
}

const CHECKS: Check[] = [
  {
    index: "groups.code (unique)",
    collection: "groups",
    key: { code: "$code" },
    match: { code: { $exists: true, $ne: null } },
    note:
      "generateUniqueGroupCode() is check-then-insert, so two groups created " +
      "concurrently can share a code. Duplicate codes make join-by-code ambiguous.",
  },
  {
    index: "attendance.{checkinId, groupId} (unique)",
    collection: "attendance",
    key: { checkinId: "$checkinId", groupId: "$groupId" },
    note:
      "POST /api/attendance does findOne-then-insert. Duplicates mean the roll " +
      "a coach sees depends on which document findOne happens to return.",
  },
  {
    index: "skippedDays.{userId, dayOfWeek, scheduledTime, date} (unique)",
    collection: "skippedDays",
    key: {
      userId: "$userId",
      dayOfWeek: "$dayOfWeek",
      scheduledTime: "$scheduledTime",
      date: "$date",
    },
    note:
      "POST /api/skipped-days looped findOne-then-insert per training slot. " +
      "Duplicates double-count skips in the streak calculation.",
  },
  {
    index: "guardianLinks.{guardianId, athleteId} (unique)",
    collection: "guardianLinks",
    key: { guardianId: "$guardianId", athleteId: "$athleteId" },
    note:
      "Three call sites upsert on this pair and one (verify-under13-child) does a " +
      "raw insertOne. Duplicates repeat the athlete in the guardian's calendar.",
  },
]

/**
 * The daily log limit (one shared + one private per user per day) is enforced by
 * a read-then-insert in POST /api/logs, so it needs its own check: the limit is
 * per local day, which is not a stored field, so group by the UTC date string.
 */
async function auditDailyLogs(db: Db): Promise<number> {
  const rows = await db
    .collection("logs")
    .aggregate([
      { $match: { timestamp: { $type: "date" } } },
      {
        $group: {
          _id: {
            userId: "$userId",
            day: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            visibility: { $ifNull: ["$visibility", "coach"] },
          },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 200 },
    ])
    .toArray()

  const label = "logs.{userId, day, visibility} — daily log limit"
  if (rows.length === 0) {
    console.log(`  OK    ${label}`)
    return 0
  }

  console.log(`  DUPES ${label} — ${rows.length} group(s) over the limit`)
  console.log(
    "        The one-shared-one-private-per-day limit is a non-atomic " +
      "read-modify-write, so a double submit bypasses it.",
  )
  if (verbose) {
    for (const r of rows.slice(0, 20)) {
      const k = r._id as { userId: string; day: string; visibility: string }
      console.log(
        `        user=${k.userId} day=${k.day} visibility=${k.visibility} count=${r.count}`,
      )
    }
  }
  return rows.length
}

async function auditCheck(db: Db, check: Check): Promise<number> {
  const pipeline: Record<string, unknown>[] = []
  if (check.match) pipeline.push({ $match: check.match })
  pipeline.push(
    { $group: { _id: check.key, count: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 200 },
  )

  const rows = await db.collection(check.collection).aggregate(pipeline).toArray()

  if (rows.length === 0) {
    console.log(`  OK    ${check.index}`)
    return 0
  }

  console.log(`  DUPES ${check.index} — ${rows.length} duplicated key(s)`)
  console.log(`        ${check.note}`)
  if (verbose) {
    for (const r of rows.slice(0, 20)) {
      console.log(
        `        ${JSON.stringify(r._id)} count=${r.count} ids=${(r.ids as unknown[])
          .map(String)
          .join(",")}`,
      )
    }
  }
  return rows.length
}

async function main() {
  const client = await connect()
  try {
    const db = client.db("pretvia")
    console.log("Duplicate audit (read-only)\n")

    let total = 0
    for (const check of CHECKS) {
      total += await auditCheck(db, check)
    }
    total += await auditDailyLogs(db)

    console.log("")
    if (total === 0) {
      console.log("No duplicates found — the unique indexes can be created safely.")
      return
    }
    console.log(
      `${total} duplicated key group(s) found. Resolve these before adding the ` +
        `unique indexes; otherwise createIndex fails and ensureIndexes reports it ` +
        `to Sentry without the index ever being built.`,
    )
    console.log("Re-run with --verbose to list the offending document ids.")
    process.exitCode = 1
  } finally {
    await client.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
