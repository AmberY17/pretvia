/**
 * Guardian Dashboard Tests
 *
 * These tests require a guardian account. Set credentials in cypress.env.json:
 *   GUARDIAN_EMAIL: "guardian@test.pretvia.com"
 *   GUARDIAN_PASSWORD: "TestPass123!"
 *
 * Guardian accounts are created through the invite redemption flow (not direct signup).
 * See `pnpm seed:test` for seeding a guardian test account.
 */

const GUARDIAN_EMAIL = Cypress.env("GUARDIAN_EMAIL");
const GUARDIAN_PASSWORD = Cypress.env("GUARDIAN_PASSWORD");

describe("Guardian Dashboard", () => {
  before(function () {
    if (!GUARDIAN_EMAIL || !GUARDIAN_PASSWORD) {
      Cypress.env("SKIP_GUARDIAN_TESTS", true);
    }
  });

  beforeEach(function () {
    if (Cypress.env("SKIP_GUARDIAN_TESTS")) {
      this.skip();
    }
    cy.login(GUARDIAN_EMAIL, GUARDIAN_PASSWORD);
    cy.visit("/dashboard");
  });

  it("guardian sees the dashboard after login", () => {
    cy.url().should("include", "/dashboard");
    cy.get("main").should("be.visible");
  });

  it("guardian dashboard shows calendar view instead of log feed", () => {
    cy.contains("Training Feed").should("not.exist");
    cy.contains(/calendar|week|schedule/i).should("be.visible");
  });

  it("shows child/athlete name in the sidebar or header", () => {
    cy.get("nav, aside, header").contains(/athlete|child/i).should("be.visible");
  });

  it("shows weekly calendar grid", () => {
    cy.findByLabelText(/E2E Athlete/i).check();
    cy.contains(/Mon|Tue|Wed|Thu|Fri/i).should("be.visible");
  });

  context("Mobile viewport", () => {
    beforeEach(function () {
      if (Cypress.env("SKIP_GUARDIAN_TESTS")) {
        this.skip();
      }
      cy.login(GUARDIAN_EMAIL, GUARDIAN_PASSWORD);
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("guardian dashboard is accessible on mobile", () => {
      cy.url().should("include", "/dashboard");
      cy.get("main").should("be.visible");
    });

    it("shows calendar view on mobile", () => {
      cy.contains("Training Feed").should("not.exist");
      cy.contains(/calendar|week|schedule/i).should("be.visible");
    });

    it("shows weekly calendar grid on mobile", () => {
      cy.findByRole("button", { name: /select athletes/i }).click();
      cy.findAllByLabelText(/E2E Athlete/i).filter(":visible").first().check();
      cy.contains(/Mon|Tue|Wed|Thu|Fri/i).should("be.visible");
    });
  });
});
