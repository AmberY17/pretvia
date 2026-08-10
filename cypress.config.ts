import { defineConfig } from "cypress";
import fs from "fs";
import { resolve } from "path";

/**
 * Code of the fixture group created by `pnpm seed:test`. Test cleanup must not
 * delete it — see the note in `cleanupTestData`. Keep in sync with
 * `scripts/seed-test-users.ts`.
 */
const SEED_GROUP_CODE = "E2ETST";

// Load .env.local so MONGODB_URI is available to cy.task handlers at runtime
for (const file of [".env.local", ".env"]) {
  const envPath = resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
    break;
  }
}

export default defineConfig({
  projectId: "ocq4yh",
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 10000,
    video: false,
    retries: { runMode: 2, openMode: 0 },
    async setupNodeEvents(on, config) {
      on("before:run", () => {
        fs.rmSync("cypress/screenshots", { recursive: true, force: true });
      });

      // Encrypt the beta flag override cookie so all tests run with beta=true
      const { encryptOverrides } = await import("flags");
      config.env.betaFlagCookie = await encryptOverrides({ beta: true });

      on("task", {
        async cleanupTestData() {
          const { MongoClient } = await import("mongodb");
          const client = new MongoClient(process.env.MONGODB_URI!);
          await client.connect();
          const db = client.db("pretvia");

          // Delete ALL logs for the test athlete (catches null/empty notes that miss the regex)
          const athleteEmail = "athlete@test.pretvia.com";
          const athlete = await db
            .collection("users")
            .findOne({ email: athleteEmail }, { projection: { _id: 1 } });
          if (athlete) {
            await db.collection("logs").deleteMany({ userId: athlete._id.toString() });
          }

          await Promise.all([
            db.collection("waitlist").deleteMany({
              email: { $regex: /@example\.com$/ },
            }),
            db.collection("comments").deleteMany({
              text: { $regex: /^E2E / },
            }),
            db.collection("logs").deleteMany({
              notes: { $regex: /^E2E / },
            }),
            db.collection("checkins").deleteMany({
              title: { $regex: /^E2E / },
            }),
            db.collection("announcements").deleteMany({
              text: { $regex: /^E2E / },
            }),
          ]);

          // Groups created *by tests*, excluding the fixture group that
          // `pnpm seed:test` provisions (code "E2ETST"). That group is shared
          // infrastructure: the seeded coach head-coaches it and the seeded
          // athlete belongs to it, so deleting it here left both accounts
          // pointing at a group that no longer existed — the coach then
          // head-coached nothing and could not review the athlete's logs.
          const e2eGroups = await db
            .collection("groups")
            .find({ name: /^E2E /, code: { $ne: SEED_GROUP_CODE } })
            .project({ _id: 1 })
            .toArray();
          const e2eGroupIds = e2eGroups.map((g) => g._id);

          if (e2eGroupIds.length > 0) {
            const idStrings = e2eGroupIds.map((id) => id.toString());
            await Promise.all([
              db.collection("groups").deleteMany({ _id: { $in: e2eGroupIds } }),
              db
                .collection("groupMemberships")
                .deleteMany({ groupId: { $in: idStrings } }),
              // Same cleanup the app performs when a group is deleted: leaving
              // these dangling is what made the failure above so hard to see.
              db
                .collection("users")
                .updateMany(
                  { groupIds: { $in: idStrings } },
                  { $pull: { groupIds: { $in: idStrings } } } as never,
                ),
              db
                .collection("users")
                .updateMany(
                  { activeGroupId: { $in: idStrings } },
                  { $unset: { activeGroupId: "" } },
                ),
            ]);
          }

          await client.close();
          return null;
        },
      });

      return config;
    },
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
  },
});
