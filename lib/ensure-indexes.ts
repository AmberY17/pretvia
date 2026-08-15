import * as Sentry from "@sentry/nextjs";
import { getDb } from "@/lib/mongodb";

let indexesEnsured = false;

/**
 * One index to create. Named so a failure can be attributed to a specific index
 * rather than to the batch — important for unique indexes, which fail when the
 * collection already holds duplicates.
 */
type IndexSpec = {
  name: string;
  run: () => Promise<unknown>;
};

/**
 * Create every declared index, reporting per-index failures.
 *
 * Deliberately uses `allSettled`, not `all`: a single failing index (typically a
 * unique index colliding with pre-existing duplicate documents) must not prevent
 * the remaining indexes from being created, and must not be silent — a missing
 * index is invisible in behaviour but shows up as a full collection scan under load.
 *
 * Returns true only if every index succeeded, so the caller can retry later.
 */
export async function ensureIndexes(): Promise<boolean> {
  if (indexesEnsured) return true;

  let db;
  try {
    db = await getDb();
  } catch (err) {
    console.error("ensureIndexes: could not get db handle:", err);
    Sentry.captureException(err, { tags: { subsystem: "ensure-indexes" } });
    return false;
  }

  const specs: IndexSpec[] = [
    // logs — most query-heavy collection
    {
      name: "logs.userId_timestamp_id",
      run: () => db.collection("logs").createIndex({ userId: 1, timestamp: -1, _id: -1 }),
    },
    // Redundant prefix of logs.userId_timestamp_id — drop rather than leave unused.
    {
      name: "logs.drop_redundant_userId",
      run: () => db.collection("logs").dropIndex("userId_1").catch(() => {}),
    },
    { name: "logs.userId_tags", run: () => db.collection("logs").createIndex({ userId: 1, tags: 1 }) },
    {
      name: "logs.checkinId_userId",
      run: () => db.collection("logs").createIndex({ checkinId: 1, userId: 1 }),
    },
    // Enforces one shared and one private standalone log per user per group per
    // day. The route's read-then-insert check could be raced by a double submit;
    // this makes the limit an invariant of the data rather than of the handler.
    //
    // Partial on `limitKey` existing: only standalone logs carry it (check-in logs
    // are exempt from the limit), and a partialFilterExpression cannot express
    // `checkinId: { $exists: false }`. Logs created before this field are simply
    // not covered, which is why the handler keeps its read-check as well.
    {
      name: "logs.userId_groupId_limitKey_unique",
      run: () =>
        db
          .collection("logs")
          .createIndex(
            { userId: 1, groupId: 1, limitKey: 1 },
            { unique: true, partialFilterExpression: { limitKey: { $exists: true } } },
          ),
    },

    // users
    {
      name: "users.email_unique",
      run: () => db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true }),
    },
    { name: "users.activeGroupId", run: () => db.collection("users").createIndex({ activeGroupId: 1 }) },
    { name: "users.groupIds", run: () => db.collection("users").createIndex({ groupIds: 1 }) },

    // announcements
    {
      name: "announcements.groupId_createdAt",
      run: () => db.collection("announcements").createIndex({ groupId: 1, createdAt: -1 }),
    },

    // checkins
    {
      name: "checkins.groupId_expiresAt",
      run: () => db.collection("checkins").createIndex({ groupId: 1, expiresAt: 1 }),
    },
    {
      name: "checkins.groupId_sessionDate",
      run: () => db.collection("checkins").createIndex({ groupId: 1, sessionDate: -1 }),
    },

    // comments
    {
      name: "comments.logId_createdAt",
      run: () => db.collection("comments").createIndex({ logId: 1, createdAt: 1 }),
    },

    // comment_reads
    {
      name: "comment_reads.userId_logId_unique",
      run: () =>
        db.collection("comment_reads").createIndex({ userId: 1, logId: 1 }, { unique: true }),
    },

    // skippedDays — the two prefix indexes below are redundant now that the
    // unique compound index (right below) starts with the same {userId,
    // dayOfWeek} prefix; drop them rather than leave them unused.
    {
      name: "skippedDays.drop_redundant_userId",
      run: () => db.collection("skippedDays").dropIndex("userId_1").catch(() => {}),
    },
    {
      name: "skippedDays.drop_redundant_userId_dayOfWeek",
      run: () => db.collection("skippedDays").dropIndex("userId_1_dayOfWeek_1").catch(() => {}),
    },
    // Unique: POST /api/skipped-days upserts one row per training slot, so this
    // is what makes those upserts safe against a concurrent duplicate.
    // The non-unique version of this index shipped first, and MongoDB will not
    // change an existing index's options in place, so drop before creating.
    {
      name: "skippedDays.userId_dayOfWeek_scheduledTime_date_unique",
      run: async () => {
        await db
          .collection("skippedDays")
          .dropIndex("userId_1_dayOfWeek_1_scheduledTime_1_date_1")
          .catch(() => {})
        return db
          .collection("skippedDays")
          .createIndex(
            { userId: 1, dayOfWeek: 1, scheduledTime: 1, date: 1 },
            { unique: true },
          )
      },
    },

    // attendance — unique so the findOne-then-insert in POST /api/attendance
    // cannot produce two rolls for one check-in under a double submit.
    // Drop the non-unique predecessor first — MongoDB will not change an existing
    // index's options in place.
    {
      name: "attendance.checkinId_groupId_unique",
      run: async () => {
        await db.collection("attendance").dropIndex("checkinId_1_groupId_1").catch(() => {})
        return db
          .collection("attendance")
          .createIndex({ checkinId: 1, groupId: 1 }, { unique: true })
      },
    },

    // log_reviews — drop legacy headCoachId index, replace with coachId
    {
      name: "log_reviews.drop_legacy_headCoachId",
      run: () => db.collection("log_reviews").dropIndex("logId_1_headCoachId_1").catch(() => {}),
    },
    {
      name: "log_reviews.logId_coachId_unique",
      run: () => db.collection("log_reviews").createIndex({ logId: 1, coachId: 1 }, { unique: true }),
    },

    // groupMemberships
    {
      name: "groupMemberships.userId_groupId_unique",
      run: () =>
        db.collection("groupMemberships").createIndex({ userId: 1, groupId: 1 }, { unique: true }),
    },
    {
      name: "groupMemberships.groupId_roleIds",
      run: () => db.collection("groupMemberships").createIndex({ groupId: 1, roleIds: 1 }),
    },

    // pending_under13_child — TTL so orphaned records auto-expire
    {
      name: "pending_under13_child.ttl",
      run: () =>
        db
          .collection("pending_under13_child")
          .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    },

    // guardianLinks
    { name: "guardianLinks.guardianId", run: () => db.collection("guardianLinks").createIndex({ guardianId: 1 }) },
    // Unique: four call sites create these links (three upserts and one raw
    // insert), none of them previously protected against a concurrent duplicate.
    {
      name: "guardianLinks.guardianId_athleteId_unique",
      run: () =>
        db
          .collection("guardianLinks")
          .createIndex({ guardianId: 1, athleteId: 1 }, { unique: true }),
    },
    {
      name: "guardianLinks.athleteId",
      run: () => db.collection("guardianLinks").createIndex({ athleteId: 1 }),
    },

    // pending_signups — token is a per-request lookup on the verify-email hot
    // path; unique because a duplicate token would resolve to the wrong
    // pending signup. TTL so abandoned signups auto-expire (routes still do
    // their own request-time expiry check — TTL deletion is lazy).
    {
      name: "pending_signups.token_unique",
      run: () => db.collection("pending_signups").createIndex({ token: 1 }, { unique: true }),
    },
    {
      name: "pending_signups.ttl",
      run: () =>
        db.collection("pending_signups").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    },

    // password_reset_tokens — same shape as pending_signups above.
    {
      name: "password_reset_tokens.token_unique",
      run: () =>
        db.collection("password_reset_tokens").createIndex({ token: 1 }, { unique: true }),
    },
    {
      name: "password_reset_tokens.ttl",
      run: () =>
        db
          .collection("password_reset_tokens")
          .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    },

    // guardianPendingAthletes — dedupe/lookup key used by the upsert in
    // redeem/type-handlers.ts.
    {
      name: "guardianPendingAthletes.guardianId_athleteEmail",
      run: () =>
        db
          .collection("guardianPendingAthletes")
          .createIndex({ guardianId: 1, athleteEmail: 1 }),
    },

    // invites — moved here from the ad hoc ensureInviteIndexes() that used to
    // run on every POST to /api/groups/[groupId]/invites; now created once at
    // startup like every other index, with the same Sentry-tagged failure
    // reporting. TTL is a separate single-field index — the compound one below
    // is still needed for the groupId-scoped queries.
    {
      name: "invites.token_unique",
      run: () => db.collection("invites").createIndex({ token: 1 }, { unique: true }),
    },
    {
      name: "invites.groupId_expiresAt",
      run: () => db.collection("invites").createIndex({ groupId: 1, expiresAt: 1 }),
    },
    {
      name: "invites.ttl",
      run: () => db.collection("invites").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    },

    // groups
    { name: "groups.headCoachId", run: () => db.collection("groups").createIndex({ headCoachId: 1 }) },
    { name: "groups.coachIds", run: () => db.collection("groups").createIndex({ coachIds: 1 }) },
    // Unique + sparse: generateUniqueGroupCode() is check-then-insert, so two
    // groups created concurrently could share a code and make join-by-code
    // ambiguous. Sparse because not every group document carries a code.
    {
      name: "groups.code_unique",
      run: () => db.collection("groups").createIndex({ code: 1 }, { unique: true, sparse: true }),
    },

    // waitlist
    {
      name: "waitlist.email_unique",
      run: () => db.collection("waitlist").createIndex({ email: 1 }, { unique: true }),
    },
    { name: "waitlist.inviteToken", run: () => db.collection("waitlist").createIndex({ inviteToken: 1 }) },
  ];

  const results = await Promise.allSettled(specs.map((s) => s.run()));

  const failed: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const spec = specs[i];
      failed.push(spec.name);
      console.error(`ensureIndexes: failed to create ${spec.name}:`, result.reason);
      Sentry.captureException(result.reason, {
        tags: { subsystem: "ensure-indexes", index: spec.name },
      });
    }
  });

  if (failed.length > 0) {
    // Left unlatched so a later cold start retries — a duplicate-key collision is
    // usually fixed by a data cleanup, after which the next attempt succeeds.
    Sentry.captureMessage(`ensureIndexes: ${failed.length} index(es) missing: ${failed.join(", ")}`, {
      level: "error",
      tags: { subsystem: "ensure-indexes" },
    });
    return false;
  }

  indexesEnsured = true;
  return true;
}
