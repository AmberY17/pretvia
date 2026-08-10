/**
 * Migration harness.
 *
 * Every schema/data migration is declared as a `Migration` and executed through
 * `runMigration()`, which:
 *   - loads .env.local / .env the same way the other scripts do,
 *   - connects to the same database the app uses,
 *   - records each successful run in the `migrations` collection so a rerun is a
 *     no-op rather than a second pass over the data,
 *   - supports `--dry-run` (report only, write nothing) and `--force` (re-run an
 *     already-applied migration).
 *
 * Migrations must still be written to be idempotent on their own — the run log is
 * a convenience and a record, not the safety mechanism. `--dry-run` against a
 * restored production snapshot is the required rehearsal step before running one
 * against production (see CLAUDE.md, "Migrations").
 *
 * Usage from a migration file:
 *   runMigration({ id: "M1-...", description: "...", async up(db, ctx) { ... } })
 */

import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { MongoClient, type Db } from "mongodb"

function loadEnv(): void {
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

export interface MigrationContext {
  /** True when invoked with --dry-run: report what would change, write nothing. */
  dryRun: boolean
  /** Record a human-readable line in the run summary. */
  log: (message: string) => void
}

export interface MigrationResult {
  /** Documents inspected. */
  scanned?: number
  /** Documents actually modified (must be 0 on a dry run). */
  modified?: number
  /** Anything else worth recording alongside the run. */
  details?: Record<string, unknown>
}

export interface Migration {
  /** Stable identifier, e.g. "M1-user-groupid-to-groupids". Never change it once run. */
  id: string
  description: string
  up: (db: Db, ctx: MigrationContext) => Promise<MigrationResult | void>
}

const MIGRATIONS_COLLECTION = "migrations"

export async function runMigration(migration: Migration): Promise<void> {
  loadEnv()

  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI is required")
    process.exit(1)
  }

  const dryRun = process.argv.includes("--dry-run")
  const force = process.argv.includes("--force")

  const client = new MongoClient(uri, { autoSelectFamily: false })
  await client.connect()
  const db = client.db("pretvia")

  const lines: string[] = []
  const ctx: MigrationContext = {
    dryRun,
    log: (message) => {
      lines.push(message)
      console.log(`  ${message}`)
    },
  }

  try {
    const already = await db.collection(MIGRATIONS_COLLECTION).findOne({ id: migration.id })
    if (already && !force && !dryRun) {
      console.log(
        `Migration ${migration.id} already applied at ${
          (already.appliedAt as Date)?.toISOString?.() ?? "unknown time"
        }. Use --force to re-run.`,
      )
      return
    }

    console.log(`${dryRun ? "[dry run] " : ""}${migration.id}: ${migration.description}`)
    const startedAt = new Date()
    const result = (await migration.up(db, ctx)) ?? {}
    const finishedAt = new Date()

    if (dryRun) {
      if (result.modified) {
        // A dry run that reports modifications means the migration ignored ctx.dryRun.
        console.error(
          `\n  WARNING: dry run reported ${result.modified} modified document(s) — ` +
            `the migration may not be honouring ctx.dryRun.`,
        )
      }
      console.log(`\n[dry run] ${migration.id} complete — no changes written.`)
      return
    }

    await db.collection(MIGRATIONS_COLLECTION).insertOne({
      id: migration.id,
      description: migration.description,
      appliedAt: finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      scanned: result.scanned ?? null,
      modified: result.modified ?? null,
      details: result.details ?? null,
      log: lines,
      rerun: Boolean(already),
    })

    console.log(
      `\n${migration.id} complete — ${result.modified ?? 0} document(s) modified` +
        (result.scanned != null ? ` of ${result.scanned} scanned.` : "."),
    )
  } finally {
    await client.close()
  }
}
