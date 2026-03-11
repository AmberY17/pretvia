/**
 * Seeds test users for Cypress e2e tests.
 * Run: pnpm seed:test
 *
 * Requires:
 * - MONGODB_URI in env
 * - TEST_ACCOUNT_EMAILS in .env.local including:
 *   athlete@test.pretvia.com,coach@test.pretvia.com,deletetest@test.pretvia.com,guardian@test.pretvia.com
 */

import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

const ATHLETE_EMAIL = "athlete@test.pretvia.com";
const ATHLETE_PASSWORD = "TestPass123!";
const COACH_EMAIL = "coach@test.pretvia.com";
const COACH_PASSWORD = "TestPass123!";
const DELETE_TEST_EMAIL = "deletetest@test.pretvia.com";
const DELETE_TEST_PASSWORD = "TestPass123!";
const GUARDIAN_EMAIL = "guardian@test.pretvia.com";
const GUARDIAN_PASSWORD = "TestPass123!";

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
  const guardianHash = await bcrypt.hash(GUARDIAN_PASSWORD, 12);

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

  // Create or update guardian (linked to athlete for guardian-calendar E2E tests)
  const guardianExists = await users.findOne({ email: GUARDIAN_EMAIL });
  let guardianId: string;
  if (!guardianExists) {
    const guardianResult = await users.insertOne({
      _id: new ObjectId(),
      email: GUARDIAN_EMAIL,
      password: guardianHash,
      displayName: "E2E Guardian",
      role: "guardian",
      groupId: null,
      groupIds: [],
      profileComplete: true,
      authProvider: "email",
      emailVerified: true,
      createdAt: new Date(),
    });
    guardianId = guardianResult.insertedId.toString();
    console.log("Created guardian:", GUARDIAN_EMAIL);
  } else {
    guardianId = guardianExists._id.toString();
    await users.updateOne(
      { email: GUARDIAN_EMAIL },
      {
        $set: {
          password: guardianHash,
          displayName: "E2E Guardian",
          emailVerified: true,
        },
      },
    );
    console.log("Updated guardian:", GUARDIAN_EMAIL);
  }

  // Link guardian to athlete
  const guardianLinks = db.collection("guardianLinks");
  await guardianLinks.updateOne(
    { guardianId, athleteId },
    { $setOnInsert: { guardianId, athleteId, createdAt: new Date() } },
    { upsert: true },
  );
  console.log("Linked guardian to athlete");

  // Create or update delete-test account (for account deletion E2E tests)
  const deleteHash = await bcrypt.hash(DELETE_TEST_PASSWORD, 12);
  const deleteExists = await users.findOne({ email: DELETE_TEST_EMAIL });
  if (!deleteExists) {
    await users.insertOne({
      _id: new ObjectId(),
      email: DELETE_TEST_EMAIL,
      password: deleteHash,
      displayName: "E2E Delete Test",
      role: "athlete",
      groupId: null,
      groupIds: [],
      profileComplete: true,
      authProvider: "email",
      emailVerified: true,
      createdAt: new Date(),
    });
    console.log("Created delete-test account:", DELETE_TEST_EMAIL);
  } else {
    await users.updateOne(
      { email: DELETE_TEST_EMAIL },
      { $set: { password: deleteHash, emailVerified: true } },
    );
    console.log("Updated delete-test account:", DELETE_TEST_EMAIL);
  }

  // Seed static invite tokens for invite redemption tests
  // Tokens are long-lived (365 days) and reseeded on each run
  const invites = db.collection("invites");
  const inviteExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  await invites.updateOne(
    { token: "e2e-invite-athlete" },
    {
      $set: {
        token: "e2e-invite-athlete",
        groupId: coachGroupId,
        type: "athlete",
        email: "e2e-invited@test.pretvia.com",
        createdBy: coachId,
        expiresAt: inviteExpiry,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  console.log("Seeded invite token: e2e-invite-athlete");

  await invites.updateOne(
    { token: "e2e-invite-parent" },
    {
      $set: {
        token: "e2e-invite-parent",
        groupId: coachGroupId,
        type: "parent",
        email: "e2e-parent@test.pretvia.com",
        athleteEmail: ATHLETE_EMAIL,
        createdBy: coachId,
        expiresAt: inviteExpiry,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  console.log("Seeded invite token: e2e-invite-parent");

  await invites.updateOne(
    { token: "e2e-invite-under13" },
    {
      $set: {
        token: "e2e-invite-under13",
        groupId: coachGroupId,
        type: "under13_parent",
        email: "e2e-under13parent@test.pretvia.com",
        athleteNamePlaceholder: "E2E Child",
        createdBy: coachId,
        expiresAt: inviteExpiry,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  console.log("Seeded invite token: e2e-invite-under13");

  // Seed waitlist invite token for E2E coach signup tests
  const waitlist = db.collection("waitlist")
  await waitlist.updateOne(
    { inviteToken: "e2e-waitlist-token" },
    {
      $set: {
        email: "e2e-waitlist@test.pretvia.com",
        name: "E2E Waitlist Coach",
        status: "approved",
        inviteToken: "e2e-waitlist-token",
        inviteExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
      $unset: { usedAt: "" },
    },
    { upsert: true }
  )
  console.log("Seeded waitlist token: e2e-waitlist-token")

  await client.close();
  console.log("\nDone. Add to .env.local:");
  console.log(
    "TEST_ACCOUNT_EMAILS=athlete@test.pretvia.com,coach@test.pretvia.com,deletetest@test.pretvia.com,guardian@test.pretvia.com",
  );
  console.log("\nOptional for Cypress (or use cypress.env.json):");
  console.log("CYPRESS_ATHLETE_EMAIL=athlete@test.pretvia.com");
  console.log("CYPRESS_ATHLETE_PASSWORD=TestPass123!");
  console.log("CYPRESS_COACH_EMAIL=coach@test.pretvia.com");
  console.log("CYPRESS_COACH_PASSWORD=TestPass123!");
  console.log("CYPRESS_GUARDIAN_EMAIL=guardian@test.pretvia.com");
  console.log("CYPRESS_GUARDIAN_PASSWORD=TestPass123!");
  console.log("CYPRESS_DELETE_TEST_EMAIL=deletetest@test.pretvia.com");
  console.log("CYPRESS_DELETE_TEST_PASSWORD=TestPass123!");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
