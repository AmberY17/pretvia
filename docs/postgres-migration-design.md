# Postgres Migration — Design Doc

Status: **draft for decision** · Date: 2026-10-11 · Related: `docs/audit-2026-10.md` (§3 security, §4 architecture), `docs/FINDINGS.md`

## 1. Summary

Pretvia's data is relational: users, groups, memberships, coach/athlete/guardian links, logs, and comments,
all joined by id. It is stored in MongoDB as 18 collections joined in application code. The redundancy and
hand-written integrity logic this forces are the source of a large share of the known bugs: membership
drift, duplicate-row races, half-finished cascades, and legacy-field compatibility branches.

This doc proposes moving to **Postgres (Neon) + Drizzle ORM** with **19 tables**. The new schema keeps one
copy of each fact and has the database enforce uniqueness, references, cascades, and allowed values. The
migration goes in four phases. The first, a data-access layer, is useful even if the switch is never made.

**Non-goals.** No product behavior changes. No change to auth (JWT cookie). No frontend changes beyond
what the API contract already guarantees. The security fixes in the audit (S1–S3) land **before** this
work and do not depend on it.

## 2. What's wrong with the current model

| Problem | Today | Consequence |
|---|---|---|
| Membership stored 3–6 times | `users.groupIds`, `users.activeGroupId`, legacy `users.groupId`, `groupMemberships`, `groups.coachIds`, `groups.headCoachId` | Drift (patched by `ensureGroupIds()` on read), authz bugs, coaches still "in" groups they left |
| Group schedule copied per user | `groups.trainingScheduleTemplate` → every member's `users.trainingSlots` (+ `sourceGroupId`), history in `users.deletedSlots` | Each schedule edit is a fan-out write over all members |
| Legacy shapes kept forever | `isGroup` vs `visibility`; logs without `groupId`; `log_reviews.headCoachId` vs `coachId` | Compatibility `$or`s repeated 11× in 3 files; wrong rows deleted |
| Mixed id types | ids stored as strings in some fields, ObjectIds in others | `.toString()` comparisons everywhere; silent mismatches |
| Uniqueness checked in code | group code, attendance, guardian links, skipped days, daily log cap: find-then-insert | Duplicates under concurrency |
| Cascades in code | account deletion: ~20 sequential deletes, no transaction | Partial deletes, dangling references, wrong scope |
| Embedded arrays mutated whole | `groups.roles`, `attendance.entries` read → modify → `$set` | Lost updates between co-coaches |
| Six token/pending stores | `pending_signups`, `password_reset_tokens`, `pending_under13_child`, `invites`, `guardianPendingAthletes`, `waitlist.inviteToken` | Six different expiry rules; plaintext tokens; one TTL index |
| No allowed-value rules | `visibility`, attendance `status`, review `status` accept anything | Validation scattered in routes (and missing in some) |

## 3. Technology choices

| Choice | Pick | Why | Alternative |
|---|---|---|---|
| Database | **Postgres 16 on Neon** | Serverless driver suited to Vercel functions; database branches per preview deploy (good for e2e); point-in-time restore | Supabase (also fine; brings auth/storage you don't need), Vercel Postgres (Neon underneath) |
| Access layer | **Drizzle ORM + drizzle-kit** | SQL-shaped queries, schema-as-TypeScript (types flow into routes), small runtime, plain SQL migrations | Prisma (heavier client and its own query language; fine but less transparent) |
| Validation | **zod** (already a dependency) | Request bodies → typed inputs; `drizzle-zod` can derive insert schemas | — |
| Extensions | `citext` | Case-insensitive unique emails without `.toLowerCase()` everywhere | Lowercase in code (current approach, inconsistent) |

**Ids.** Keep existing ids: every Mongo `_id` becomes a `text` primary key with its 24-hex value
unchanged. New rows get `gen_random_uuid()::text`. This means the migration needs no id remapping, and
URLs, cookies, and client caches keep working. The cost is mixed id formats in one column, which is
harmless for opaque keys.

## 4. Proposed schema

```sql
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE user_role         AS ENUM ('athlete', 'coach', 'guardian');
CREATE TYPE member_role       AS ENUM ('athlete', 'coach');
CREATE TYPE plan_tier         AS ENUM ('squad', 'varsity', 'club');
CREATE TYPE log_visibility    AS ENUM ('coach', 'private');
CREATE TYPE review_status     AS ENUM ('pending', 'reviewed', 'revisit');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'excused');
CREATE TYPE announce_scope    AS ENUM ('group', 'club');
CREATE TYPE invite_type       AS ENUM ('athlete', 'coach', 'parent', 'under13_parent');
CREATE TYPE token_purpose     AS ENUM ('email_verify', 'password_reset', 'under13_verify');
CREATE TYPE waitlist_status   AS ENUM ('pending', 'approved');

-- ── Identity ────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id               text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email            citext NOT NULL UNIQUE,
  password_hash    text,                                   -- null = Google-only
  google_id        text UNIQUE,
  email_verified   boolean NOT NULL DEFAULT false,
  role             user_role NOT NULL,
  display_name     text NOT NULL,
  first_name       text,
  last_name        text,
  date_of_birth    date,
  profile_emoji    text,
  timezone         text,                                   -- IANA, e.g. 'America/Toronto' (fixes streak/day-boundary bugs)
  active_group_id  text,                                   -- FK added after groups exists
  profile_complete boolean NOT NULL DEFAULT true,
  preferences      jsonb NOT NULL DEFAULT '{}',            -- UI-only prefs (filter order, onboarding flags)
  -- coach subscription (null for non-coaches)
  plan             plan_tier,
  is_assistant     boolean NOT NULL DEFAULT false,
  add_on_groups    int NOT NULL DEFAULT 0 CHECK (add_on_groups >= 0),
  add_on_seats     int NOT NULL DEFAULT 0 CHECK (add_on_seats >= 0),
  token_version    int NOT NULL DEFAULT 0,                 -- bump to revoke all sessions (audit S12)
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Groups & membership ─────────────────────────────────────────────────────
CREATE TABLE groups (
  id                  text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                text NOT NULL CHECK (length(trim(name)) >= 2),
  code                text NOT NULL UNIQUE,                -- audit DB-3: datastore-enforced
  head_coach_id       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- owner leaves → group goes
  schedule_updated_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON groups (head_coach_id);

ALTER TABLE users ADD FOREIGN KEY (active_group_id) REFERENCES groups(id) ON DELETE SET NULL;

-- ONE table replaces users.groupIds + groups.coachIds + groupMemberships.
CREATE TABLE group_members (
  group_id   text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    text NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  role       member_role NOT NULL,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX ON group_members (user_id);
-- Invariant (enforced in the membership module, in the same transaction as group creation):
-- the head coach always has a row here with role = 'coach'.

CREATE TABLE group_roles (                                 -- replaces groups.roles[] (lost-update race, API-11)
  id        text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id  text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name      text NOT NULL CHECK (length(trim(name)) >= 1),
  UNIQUE (group_id, name)
);

CREATE TABLE member_roles (                                -- replaces groupMemberships.roleIds[]
  group_id  text NOT NULL,
  user_id   text NOT NULL,
  role_id   text NOT NULL REFERENCES group_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, user_id, role_id),
  FOREIGN KEY (group_id, user_id) REFERENCES group_members ON DELETE CASCADE
);

-- Group template slots AND personal slots in one table; no per-member copies.
-- valid_from/valid_to replace users.deletedSlots/addedAt so streaks can be
-- computed against the schedule that was in force on a past date.
CREATE TABLE training_slots (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id     text REFERENCES groups(id) ON DELETE CASCADE,   -- set = group template slot
  user_id      text REFERENCES users(id)  ON DELETE CASCADE,   -- set = personal slot
  day_of_week  smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   time NOT NULL,
  valid_from   timestamptz NOT NULL DEFAULT now(),
  valid_to     timestamptz,                                    -- null = current
  CHECK ((group_id IS NULL) <> (user_id IS NULL))
);
CREATE INDEX ON training_slots (group_id) WHERE valid_to IS NULL;
CREATE INDEX ON training_slots (user_id)  WHERE valid_to IS NULL;

CREATE TABLE guardian_links (
  guardian_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (guardian_id, athlete_id)                      -- audit DB-5: upsert race gone
);
CREATE INDEX ON guardian_links (athlete_id);

CREATE TABLE guardian_pending (                            -- guardian invited before athlete has an account
  guardian_id   text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_email citext NOT NULL,
  PRIMARY KEY (guardian_id, athlete_email)
);
CREATE INDEX ON guardian_pending (athlete_email);

-- ── Training activity ───────────────────────────────────────────────────────
CREATE TABLE checkins (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id      text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by    text REFERENCES users(id) ON DELETE SET NULL,   -- was misnamed checkins.headCoachId
  title         text,
  session_date  timestamptz NOT NULL,
  expires_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON checkins (group_id, session_date DESC);

CREATE TABLE logs (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id    text REFERENCES groups(id)   ON DELETE SET NULL,  -- athlete keeps history if group is deleted
  checkin_id  text REFERENCES checkins(id) ON DELETE SET NULL,
  emoji       text NOT NULL CHECK (length(emoji) BETWEEN 1 AND 16),
  visibility  log_visibility NOT NULL,                          -- no more isGroup
  notes       text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  tags        text[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20),
  logged_at   timestamptz NOT NULL,                             -- was "timestamp"
  local_date  date NOT NULL,                                    -- user's calendar day at creation (daily cap)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON logs (user_id, logged_at DESC, id DESC);        -- feed + cursor pagination
CREATE INDEX ON logs (group_id, logged_at DESC, id DESC);       -- coach feed
CREATE INDEX ON logs USING gin (tags);
-- Daily cap (one shared + one private standalone log per user/group/day), now atomic (API-12):
CREATE UNIQUE INDEX logs_daily_cap
  ON logs (user_id, coalesce(group_id, ''), local_date, visibility)
  WHERE checkin_id IS NULL;

CREATE TABLE comments (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  log_id      text NOT NULL REFERENCES logs(id)  ON DELETE CASCADE,
  author_id   text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 1000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz
);
CREATE INDEX ON comments (log_id, created_at);

CREATE TABLE comment_reads (
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_id       text NOT NULL REFERENCES logs(id)  ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, log_id)
);

CREATE TABLE log_reviews (
  log_id     text NOT NULL REFERENCES logs(id)  ON DELETE CASCADE,
  coach_id   text NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- one field, not coachId|headCoachId
  status     review_status NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (log_id, coach_id)
);

CREATE TABLE attendance (                                  -- one row per athlete, not an entries[] blob
  checkin_id  text NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  status      attendance_status NOT NULL,
  recorded_by text REFERENCES users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (checkin_id, user_id)                        -- audit DB-4: duplicate-doc race gone
);

CREATE TABLE skipped_days (
  user_id        text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date           date NOT NULL,                            -- dayOfWeek dropped: derived from date
  scheduled_time time NOT NULL,
  reason         text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 200),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date, scheduled_time)              -- API-13: race gone; bulk insert ... ON CONFLICT DO NOTHING
);

CREATE TABLE announcements (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id   text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  author_id  text REFERENCES users(id) ON DELETE SET NULL,
  body       text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 500),
  scope      announce_scope NOT NULL DEFAULT 'group',      -- 'club' = all groups of the group's head coach
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON announcements (group_id, created_at DESC);

-- ── Invitations, tokens, waitlist ───────────────────────────────────────────
CREATE TABLE invites (
  token_hash        text PRIMARY KEY,                      -- sha256 of the emailed token; raw token never stored
  type              invite_type NOT NULL,
  group_id          text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  email             citext NOT NULL,
  athlete_email     citext,                                -- parent invites
  name_placeholder  text CHECK (length(name_placeholder) <= 100),
  created_by        text REFERENCES users(id) ON DELETE SET NULL,
  expires_at        timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON invites (group_id, expires_at);
CREATE UNIQUE INDEX invites_one_open_per_email ON invites (group_id, type, email);  -- API-18 dedupe

-- Replaces pending_signups, password_reset_tokens, pending_under13_child.
CREATE TABLE auth_tokens (
  token_hash  text PRIMARY KEY,
  purpose     token_purpose NOT NULL,
  email       citext NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',                 -- pending-signup / under-13 form data (password already hashed)
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON auth_tokens (email, purpose);
CREATE INDEX ON auth_tokens (expires_at);

CREATE TABLE waitlist (
  id                text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email             citext NOT NULL UNIQUE,
  first_name        text NOT NULL,
  last_name         text NOT NULL,
  club_name         text NOT NULL,
  groups            jsonb NOT NULL DEFAULT '[]',           -- free-form survey answers; validated with zod on write
  status            waitlist_status NOT NULL DEFAULT 'pending',
  invite_token_hash text UNIQUE,
  invite_expires_at timestamptz,
  invite_sent_at    timestamptz,
  approved_at       timestamptz,
  used_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
```

Postgres has no TTL indexes. Expired `auth_tokens`/`invites` are rejected at read time (already the
pattern) and purged by a daily Vercel Cron: `DELETE … WHERE expires_at < now() - interval '7 days'`.

## 5. Collection → table mapping

| Mongo collection / field | Postgres | Notes |
|---|---|---|
| `users` | `users` | `subscription.*` → `plan`/`is_assistant`/`add_on_*` columns |
| `users.groupIds`, `groups.coachIds`, `groupMemberships` | `group_members` | **3 → 1** |
| `users.groupId` (legacy) | `group_members` | backfilled, field dropped (completes migration M1) |
| `groupMemberships.roleIds` | `member_roles` | |
| `groups.roles[]` | `group_roles` | |
| `groups.trainingScheduleTemplate` | `training_slots` (group rows) | stored once |
| `users.trainingSlots` | `training_slots` (user rows) | **only personal slots**; group copies dropped |
| `users.deletedSlots`, `addedAt`, `removedAt` | `training_slots.valid_from/valid_to` | |
| `logs.isGroup` | `logs.visibility` | converted once; field dropped |
| `logs.timestamp` | `logs.logged_at` (+ derived `local_date`) | |
| `logs.tags` | `logs.tags text[]` | `/api/tags` becomes `SELECT DISTINCT unnest(tags)` |
| `log_reviews.headCoachId` / `coachId` | `log_reviews.coach_id` | merged |
| `checkins.headCoachId` | `checkins.created_by` | renamed to what it means |
| `attendance.entries[]` | `attendance` rows | one per athlete |
| `attendance.headCoachId`, `groupId`, `sessionDate` | dropped / via `checkins` | derivable |
| `skippedDays.dayOfWeek` | dropped | derivable from `date` |
| `guardianLinks` | `guardian_links` | |
| `guardianPendingAthletes` | `guardian_pending` | |
| `invites` | `invites` | token hashed |
| `pending_signups`, `password_reset_tokens`, `pending_under13_child` | `auth_tokens` | **3 → 1**, tokens hashed |
| `waitlist` | `waitlist` | invite token hashed |
| `comments`, `comment_reads`, `announcements`, `checkins` | same names | `text` → `body` |
| `lib/ensure-indexes.ts` | drizzle-kit migrations | indexes become versioned and blocking |

## 6. Code that gets deleted or simplified

| Today | After |
|---|---|
| `ensureGroupIds()` drift repair on every read | deleted |
| `canManageGroup()`: 2 lookups, 4 clauses, `.toString()` | `SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2 AND role='coach'` |
| Legacy visibility `$or` in 11 places | `visibility = 'coach'` |
| Legacy "no groupId" `$or` in log queries | gone (backfilled) |
| `applyGroupTrainingScheduleToAllMembers` fan-out | gone; edit the group's rows |
| Account deletion, ~20 writes | `DELETE FROM users WHERE id=$1` in a transaction; owned groups, memberships, logs, comments, reviews and tokens cascade. Assistant coaches just lose their `group_members` row, so the audit's DB-1 group-destruction bug becomes impossible. |
| Daily-cap check + insert | plain `INSERT`; unique-violation → 409 |
| Attendance / skipped-days find-then-insert loops | `INSERT … ON CONFLICT (…) DO UPDATE` / `DO NOTHING` |
| `fetchUserDisplayNames` and other in-app joins | `JOIN users` |
| `generateUniqueGroupCode` check-then-insert loop | insert; retry on unique violation |

Example — the coach feed query that `buildVisibilityFilter` + `fetchUserDisplayNames` + `buildReviewStatusMap` assemble today:

```sql
SELECT l.*, u.display_name, coalesce(r.status, 'pending') AS review_status
FROM logs l
JOIN group_members gm ON gm.group_id = $group AND gm.user_id = l.user_id
JOIN users u          ON u.id = l.user_id
LEFT JOIN log_reviews r ON r.log_id = l.id AND r.coach_id = $coach
WHERE l.group_id = $group
  AND l.visibility = 'coach'
  AND (l.logged_at, l.id) < ($cursor_ts, $cursor_id)      -- keyset pagination
ORDER BY l.logged_at DESC, l.id DESC
LIMIT 21;
```

## 7. Migration plan

| Phase | Work | Exit criteria | Size |
|---|---|---|---|
| **0** | Ship audit security fixes S1–S3 on Mongo | Fixes deployed | S |
| **1** | Data-access layer **on Mongo**: `lib/db/{users,groups,membership,logs,checkins,invites,auth-tokens}.ts`. Routes call these functions only, with no `db.collection()` outside `lib/db/`. Migrate route by route, keeping e2e green. | `grep 'collection("' app/` returns nothing | **L** (largest phase; valuable even if you stop here) |
| **2** | Drizzle schema (§4), drizzle-kit migrations, Neon project + dev/preview branches. Implement `lib/db/*` against Postgres behind the same function signatures. | Unit + e2e suites pass against Postgres locally | M |
| **3** | ETL script `scripts/migrate-mongo-to-pg.ts` (rules below). Rehearse on a **production snapshot**; produce a reconciliation report. | Report shows 0 unexplained diffs; e2e passes on migrated snapshot | M |
| **4** | Cutover: put the app in maintenance mode, final ETL, switch `DATABASE_URL`, smoke test, reopen. Keep Mongo read-only for 30 days, then archive a final dump. | Prod on Postgres | S |

At current data volume a short maintenance window is simpler and safer than dual writes or CDC. Re-check
once real counts are known (§9).

### ETL cleaning rules (phase 3)

The script is idempotent: it truncates the target and reloads. It writes a report of every row it fixed or dropped.

1. **Ids** copied as-is (24-hex strings).
2. **Membership**: union of `users.groupIds`, legacy `users.groupId`, `users.activeGroupId`,
   `groupMemberships`, and `groups.coachIds`. Role is `coach` if the user is in `coachIds`, is the
   `headCoachId`, or has `role:'coach'` with a membership doc; otherwise `athlete`. Always insert the head
   coach as `coach`. Drop references to groups that no longer exist (report count).
3. **Visibility**: `visibility ?? (isGroup ? 'coach' : 'private')`. Any other stored value becomes
   `'private'` (report).
4. **Logs without `groupId`**: if the user belonged to exactly one group at migration time, assign it;
   otherwise leave null (report). Invalid `timestamp` falls back to `createdAt`. `local_date` is the date
   of `createdAt` in the user's timezone, or UTC if unknown.
5. **Training slots**: group rows from each `trainingScheduleTemplate`. User rows from
   `users.trainingSlots` entries **without** `sourceGroupId`. Rows from `deletedSlots` with `removedAt`
   become rows with `valid_to` set, so historical streaks still compute the same. Verify by running
   `computeStreak` on a sample of users before and after; results must match.
6. **Duplicates**:
   - group codes: keep the oldest, regenerate the rest and report them so those coaches can be told;
   - attendance: newest `updatedAt` wins per `(checkin, user)`;
   - guardian links, skipped days, comment reads: collapse to one row;
   - daily-cap collisions: keep all rows and fall back to a non-unique cap for legacy days (report).
7. **Reviews**: `coach_id = coachId ?? headCoachId`.
8. **Tokens**: copy only unexpired `invites`, `auth_tokens` and waitlist invites, hashing each token with sha256.
9. **Reconciliation**: per-table row counts vs. source, FK orphan counts (must be 0), and a
   streak/feed-count spot-check for 50 random users.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Behavior drift in subtle rules (streaks, visibility, daily cap) | Phase 1 puts every rule behind `lib/db/*` first; the same e2e suite runs before and after; streak before/after spot-check in ETL |
| Serverless connection exhaustion | Neon serverless driver (HTTP/WebSocket) or pooled connection string; no long-lived pools |
| ETL data surprises | Rehearse on prod snapshot; ETL report reviewed before cutover |
| Scope creep ("while we're at it") | Non-goals in §1; product changes go in separate PRs |
| Losing the e2e safety net | Keep the Cypress suite (or a trimmed smoke set) through phase 4 — see recommendation in chat |

## 9. Open questions (need answers before phase 2)

1. **Data volume.** Row counts per collection in prod. This decides whether a maintenance window works.
2. **Personal edits to group slots.** Can an athlete remove or override a slot inherited from their group
   today? If yes, add `slot_overrides(user_id, slot_id, hidden)`. If no, the schema above is complete.
3. **Timezone.** Capture `users.timezone` from the browser at login. This fixes the day-boundary and
   streak issues (audit infra-8) and is cheapest to add now.
4. **Group deletion.** Today groups are deleted only via account deletion. Is "coach deletes a group"
   planned? The cascade rules above already support it.
5. **Other Mongo consumers.** Any scripts, BI tools, or Atlas triggers reading the database besides this
   app? None were found in the repo.
