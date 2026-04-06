import { getDb } from "@/lib/mongodb";

let indexesEnsured = false;

export async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  indexesEnsured = true;

  try {
    const db = await getDb();

    await Promise.all([
      // logs — most query-heavy collection
      db.collection("logs").createIndex({ userId: 1, timestamp: -1, _id: -1 }),
      db.collection("logs").createIndex({ userId: 1 }),
      db.collection("logs").createIndex({ userId: 1, tags: 1 }),
      db.collection("logs").createIndex({ checkinId: 1, userId: 1 }),

      // users
      db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true }),
      db.collection("users").createIndex({ activeGroupId: 1 }),
      db.collection("users").createIndex({ groupIds: 1 }),

      // announcements
      db.collection("announcements").createIndex({ groupId: 1, createdAt: -1 }),

      // checkins
      db.collection("checkins").createIndex({ groupId: 1, expiresAt: 1 }),
      db.collection("checkins").createIndex({ groupId: 1, sessionDate: -1 }),

      // comments
      db.collection("comments").createIndex({ logId: 1, createdAt: 1 }),

      // comment_reads
      db.collection("comment_reads").createIndex({ userId: 1, logId: 1 }, { unique: true }),

      // skippedDays
      db.collection("skippedDays").createIndex({ userId: 1 }),
      db.collection("skippedDays").createIndex({ userId: 1, dayOfWeek: 1 }),
      db.collection("skippedDays").createIndex({ userId: 1, dayOfWeek: 1, scheduledTime: 1, date: 1 }),

      // attendance
      db.collection("attendance").createIndex({ checkinId: 1, groupId: 1 }),

      // log_reviews — drop legacy headCoachId index, replace with coachId
      db
        .collection("log_reviews")
        .dropIndex("logId_1_headCoachId_1")
        .catch(() => {}),
      db.collection("log_reviews").createIndex({ logId: 1, coachId: 1 }, { unique: true }),

      // groupMemberships
      db.collection("groupMemberships").createIndex({ userId: 1, groupId: 1 }, { unique: true }),
      db.collection("groupMemberships").createIndex({ groupId: 1, roleIds: 1 }),

      // pending_under13_child — TTL so orphaned records auto-expire
      db.collection("pending_under13_child").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),

      // guardianLinks
      db.collection("guardianLinks").createIndex({ guardianId: 1 }),

      // groups
      db.collection("groups").createIndex({ headCoachId: 1 }),
      db.collection("groups").createIndex({ coachIds: 1 }),

      // waitlist
      db.collection("waitlist").createIndex({ email: 1 }, { unique: true }),
      db.collection("waitlist").createIndex({ inviteToken: 1 }),
    ]);
  } catch (err) {
    // Non-fatal: indexes are advisory. Log but don't crash the request.
    console.error("ensureIndexes error:", err);
  }
}
