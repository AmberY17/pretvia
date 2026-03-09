/**
 * Invite Redemption Tests
 *
 * These tests require static invite tokens seeded via `pnpm seed:test`.
 * Expected tokens in the `invites` collection:
 *   - "e2e-invite-athlete" (type: "athlete", email: "e2e-invited@test.pretvia.com")
 *   - "e2e-invite-parent"  (type: "parent", email: "e2e-parent@test.pretvia.com")
 *
 * See scripts/seed-test-users.ts for seeding logic.
 */

describe("Invite Redemption — Athlete Invite", () => {
  it("shows 404 error for an invalid invite token", () => {
    cy.visit("/invite/totally-invalid-token-xyz", { failOnStatusCode: false });
    cy.contains(/not found|expired|invalid/i).should("be.visible");
  });

  it("shows the athlete join form for a valid athlete invite token", () => {
    cy.visit("/invite/e2e-invite-athlete", { failOnStatusCode: false });
    cy.contains(/Join|sign in|create/i).should("be.visible");
    cy.get('input[type="email"]').should("be.visible");
    cy.get('input[type="password"]').should("be.visible");
  });

  it("shows the group name on the athlete invite page", () => {
    cy.visit("/invite/e2e-invite-athlete", { failOnStatusCode: false });
    cy.contains(/E2E Test Group|Join/i).should("be.visible");
  });

  it("shows toggle between sign in and create account", () => {
    cy.visit("/invite/e2e-invite-athlete", { failOnStatusCode: false });
    cy.contains(/Already have an account|Create new account/i).should(
      "be.visible",
    );
  });

  context("Mobile viewport", () => {
    it("shows athlete invite form on small screen", () => {
      cy.viewport(375, 667);
      cy.visit("/invite/e2e-invite-athlete", { failOnStatusCode: false });
      cy.contains(/Join|sign in|create/i).should("be.visible");
      cy.get('input[type="email"]').should("be.visible");
      cy.get('input[type="password"]').should("be.visible");
    });
  });
});

describe("Invite Redemption — Parent Invite", () => {
  it("shows the parent form for a valid parent invite token", () => {
    cy.visit("/invite/e2e-invite-parent", { failOnStatusCode: false });
    cy.contains(/sign in|create.*parent|parent/i).should("be.visible");
    cy.get('input[type="email"]').should("be.visible");
  });

  context("Mobile viewport", () => {
    it("shows parent invite form on small screen", () => {
      cy.viewport(375, 667);
      cy.visit("/invite/e2e-invite-parent", { failOnStatusCode: false });
      cy.contains(/sign in|create.*parent|parent/i).should("be.visible");
      cy.get('input[type="email"]').should("be.visible");
    });
  });
});

describe("Invite Redemption — Under-13 Parent Invite", () => {
  it("shows the under-13 setup form for a valid under-13 invite token", () => {
    cy.visit("/invite/e2e-invite-under13", { failOnStatusCode: false });
    cy.contains(/child|under.*13|set up/i).should("be.visible");
  });

  context("Mobile viewport", () => {
    it("shows under-13 invite form on small screen", () => {
      cy.viewport(375, 667);
      cy.visit("/invite/e2e-invite-under13", { failOnStatusCode: false });
      cy.contains(/child|under.*13|set up/i).should("be.visible");
    });
  });
});
