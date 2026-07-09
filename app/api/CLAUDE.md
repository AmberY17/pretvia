# API Routes — Pretvia

## Standard Route Structure

Every route handler follows this pattern:

```typescript
export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getDb()
    // ... handler logic

    return NextResponse.json({ ... })
  } catch (err) {
    console.error("GET /api/your-path:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
```

## Auth Checks

- **Session guard:** `getSession()` from `lib/auth.ts` — returns null if missing/invalid → 401
- **Coach guard:** `canManageGroup(db, userId, groupId)` from `lib/api-auth.ts` → 403 if not coach
- Always check session before touching the DB

## ObjectId Handling

```typescript
const oid = safeObjectId(id)   // from lib/objectid.ts
if (!oid) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
```

Never construct `new ObjectId(id)` directly from user input — use `safeObjectId` first.

## Error Shape

Always return `{ error: string }` — never a bare string or nested object.

```typescript
// Correct
return NextResponse.json({ error: "Log not found" }, { status: 404 })

// Wrong
return NextResponse.json("not found", { status: 404 })
```

## Dual Fields Gotcha

See "Key Gotcha: Dual/Overlapping Fields" and "DB Audit Findings" in the root `CLAUDE.md`. Short version:
- **users:** `groupIds` + `activeGroupId`; legacy singular `groupId` is read-only compat in one spot (pending migration M1)
- **groups:** `headCoachId` (owner) + `coachIds` (coaches) — head coach not guaranteed to be in `coachIds`; check both, compare via `.toString()` (types vary)
- Membership lives in BOTH `users.groupIds` and `groupMemberships` — keep in sync

`canManageGroup()` already handles this for coach checks.

See "API Audit Findings (2026-07-07)" in the root `CLAUDE.md` for known open route-layer issues (authz gaps, visibility-model leaks, membership desync, input validation).

## DB Collections

`users`, `groups`, `logs`, `comments`, `checkins`, `announcements`, `invites`, `skippedDays`, `attendance`, `guardianLinks`, `groupMemberships`, `log_reviews`, `comment_reads`, `waitlist`, `pending_signups`, `password_reset_tokens`, `pending_under13_child`, `guardianPendingAthletes`

No `tags` collection — tags are aggregated from `logs.tags`. Indexes: `lib/ensure-indexes.ts`.
