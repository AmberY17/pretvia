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

Users and groups use both singular and array relationship fields:
- `groupId` / `groupIds` on users
- `coachId` / `coachIds` on groups

Always handle both when querying:
```typescript
const groups = Array.isArray(user.groupIds) ? user.groupIds : []
if (user.groupId && !groups.includes(user.groupId)) groups.push(user.groupId)
```

`canManageGroup()` already handles this for coach checks.

## DB Collections

`users`, `groups`, `logs`, `comments`, `checkins`, `announcements`, `tags`, `invites`, `skippedDays`, `attendance`, `guardianLinks`, `groupMemberships`
