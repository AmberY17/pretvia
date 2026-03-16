import { defineConfig } from "cypress";
import fs from "fs";

export default defineConfig({
  projectId: "ocq4yh",
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 10000,
    video: false,
    retries: { runMode: 2, openMode: 0 },
    setupNodeEvents(on, _config) {
      on("before:run", () => {
        fs.rmSync("cypress/screenshots", { recursive: true, force: true });
      });

      on("task", {
        async cleanupTestData() {
          const { MongoClient } = await import("mongodb");
          const client = new MongoClient(process.env.MONGODB_URI!);
          await client.connect();
          const db = client.db();

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

          const e2eGroups = await db
            .collection("groups")
            .find({ name: /^E2E / })
            .project({ _id: 1 })
            .toArray();
          const e2eGroupIds = e2eGroups.map((g) => g._id);

          if (e2eGroupIds.length > 0) {
            await Promise.all([
              db
                .collection("groups")
                .deleteMany({ _id: { $in: e2eGroupIds } }),
              db
                .collection("groupMemberships")
                .deleteMany({ groupId: { $in: e2eGroupIds } }),
            ]);
          }

          await client.close();
          return null;
        },
      });
    },
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
  },
});
