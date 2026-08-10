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
    { name: "logs.userId", run: () => db.collection("logs").createIndex({ userId: 1 }) },
    { name: "logs.userId_tags", run: () => db.collection("logs").createIndex({ userId: 1, tags: 1 }) },
    {
      name: "logs.checkinId_userId",
      run: () => db.collection("logs").createIndex({ checkinId: 1, userId: 1 }),
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

    // skippedDays
    { name: "skippedDays.userId", run: () => db.collection("skippedDays").createIndex({ userId: 1 }) },
    {
      name: "skippedDays.userId_dayOfWeek",
      run: () => db.collection("skippedDays").createIndex({ userId: 1, dayOfWeek: 1 }),
    },
    {
      name: "skippedDays.userId_dayOfWeek_scheduledTime_date",
      run: () =>
        db
          .collection("skippedDays")
          .createIndex({ userId: 1, dayOfWeek: 1, scheduledTime: 1, date: 1 }),
    },

    // attendance
    {
      name: "attendance.checkinId_groupId",
      run: () => db.collection("attendance").createIndex({ checkinId: 1, groupId: 1 }),
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

    // groups
    { name: "groups.headCoachId", run: () => db.collection("groups").createIndex({ headCoachId: 1 }) },
    { name: "groups.coachIds", run: () => db.collection("groups").createIndex({ coachIds: 1 }) },

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
