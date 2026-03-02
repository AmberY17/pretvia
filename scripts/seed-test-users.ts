/**
 * Seeds test users for Cypress e2e tests.
 * Run: pnpm seed:test
 *
 * Requires:
 * - MONGODB_URI in env
 * - TEST_ACCOUNT_EMAILS in .env.local including:
 *   athlete@test.pretvia.com,coach@test.pretvia.com
 */

import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

const ATHLETE_EMAIL = "athlete@test.pretvia.com";
const ATHLETE_PASSWORD = "TestPass123!";
const COACH_EMAIL = "coach@test.pretvia.com";
const COACH_PASSWORD = "TestPass123!";

async function seed() {
  const uri = process.env.MONGODB_URI;
  console.log("uri", uri);
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  const client = new MongoClient(uri, { autoSelectFamily: false });
  await client.connect();
  const db = client.db("pretvia");
  const users = db.collection("users");
  const groups = db.collection("groups");

  const athleteHash = await bcrypt.hash(ATHLETE_PASSWORD, 12);
  const coachHash = await bcrypt.hash(COACH_PASSWORD, 12);

  const groupMemberships = db.collection("groupMemberships");

  // Default role so the RoleFilter component renders "All Roles" in coach tests
  const defaultRoles = [{ id: "e2e-role-1", name: "E2E Athlete Role" }];

  // Ensure coach has a group for coach-specific tests
  let coachGroupId: string;
  const existingGroup = await groups.findOne({ name: "E2E Test Group" });
  if (existingGroup) {
    coachGroupId = existingGroup._id.toString();
    // Ensure the group always has at least the default role
    await groups.updateOne(
      { _id: existingGroup._id },
      { $set: { roles: defaultRoles } },
    );
  } else {
    const groupResult = await groups.insertOne({
      name: "E2E Test Group",
      code: "E2ETST",
      roles: defaultRoles,
      createdAt: new Date(),
    });
    coachGroupId = groupResult.insertedId.toString();
  }

  // Create or update coach
  const coachExists = await users.findOne({ email: COACH_EMAIL });
  let coachId: string;
  if (!coachExists) {
    const coachResult = await users.insertOne({
      _id: new ObjectId(),
      email: COACH_EMAIL,
      password: coachHash,
      displayName: "E2E Coach",
      role: "coach",
      groupId: coachGroupId,
      groupIds: [coachGroupId],
      profileComplete: true,
      authProvider: "email",
      emailVerified: true,
      createdAt: new Date(),
    });
    coachId = coachResult.insertedId.toString();
    console.log("Created coach:", COACH_EMAIL);
  } else {
    coachId = coachExists._id.toString();
    await users.updateOne(
      { email: COACH_EMAIL },
      {
        $set: {
          password: coachHash,
          displayName: "E2E Coach",
          groupId: coachGroupId,
          groupIds: [coachGroupId],
          emailVerified: true,
        },
      },
    );
    console.log("Updated coach:", COACH_EMAIL);
  }

  // Update group with coachId if missing
  await groups.updateOne(
    { _id: new ObjectId(coachGroupId) },
    { $set: { coachId, coachIds: [coachId] } },
  );

  // Ensure coach has groupMembership
  await groupMemberships.updateOne(
    { userId: coachId, groupId: coachGroupId },
    { $setOnInsert: { userId: coachId, groupId: coachGroupId, roleIds: [] } },
    { upsert: true },
  );

  // Create or update athlete
  const athleteExists = await users.findOne({ email: ATHLETE_EMAIL });
  let athleteId: string;
  if (!athleteExists) {
    const athleteResult = await users.insertOne({
      _id: new ObjectId(),
      email: ATHLETE_EMAIL,
      password: athleteHash,
      displayName: "E2E Athlete",
      role: "athlete",
      groupId: coachGroupId,
      groupIds: [coachGroupId],
      profileComplete: true,
      authProvider: "email",
      emailVerified: true,
      createdAt: new Date(),
    });
    athleteId = athleteResult.insertedId.toString();
    console.log("Created athlete:", ATHLETE_EMAIL);
  } else {
    athleteId = athleteExists._id.toString();
    await users.updateOne(
      { email: ATHLETE_EMAIL },
      {
        $set: {
          password: athleteHash,
          displayName: "E2E Athlete",
          groupId: coachGroupId,
          groupIds: [coachGroupId],
          emailVerified: true,
        },
      },
    );
    console.log("Updated athlete:", ATHLETE_EMAIL);
  }

  // Ensure athlete has groupMembership
  await groupMemberships.updateOne(
    { userId: athleteId, groupId: coachGroupId },
    { $setOnInsert: { userId: athleteId, groupId: coachGroupId, roleIds: [] } },
    { upsert: true },
  );

  await client.close();
  console.log("\nDone. Add to .env.local:");
  console.log(
    "TEST_ACCOUNT_EMAILS=athlete@test.pretvia.com,coach@test.pretvia.com",
  );
  console.log("\nOptional for Cypress (or use cypress.env.json):");
  console.log("CYPRESS_ATHLETE_EMAIL=athlete@test.pretvia.com");
  console.log("CYPRESS_ATHLETE_PASSWORD=TestPass123!");
  console.log("CYPRESS_COACH_EMAIL=coach@test.pretvia.com");
  console.log("CYPRESS_COACH_PASSWORD=TestPass123!");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
