/**
 * Account Deletion Tests
 *
 * These tests use a dedicated delete-test account seeded via `pnpm seed:test`:
 *   Email: deletetest@test.pretvia.com
 *   Password: TestPass123!
 *
 * IMPORTANT: Run `pnpm seed:test` between test runs to recreate the delete-test account.
 */

const DELETE_EMAIL =
  Cypress.env("DELETE_TEST_EMAIL") ?? "deletetest@test.pretvia.com";
const DELETE_PASSWORD =
  Cypress.env("DELETE_TEST_PASSWORD") ?? "TestPass123!";

describe("Account Deletion", () => {
  before(function () {
    cy.request({
      method: "POST",
      url: "/api/auth/login",
      body: { email: DELETE_EMAIL, password: DELETE_PASSWORD },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status !== 200) {
        Cypress.env("SKIP_DELETE_TESTS", true);
      }
    });
  });

  beforeEach(function () {
    if (Cypress.env("SKIP_DELETE_TESTS")) {
      this.skip();
    }
  });

  it("shows Delete Account section on account page", () => {
    cy.login(DELETE_EMAIL, DELETE_PASSWORD);
    cy.visit("/dashboard/account");
    cy.contains(/Delete Account/i).should("be.visible");
  });

  it("shows confirmation dialog when clicking Delete Account", () => {
    cy.login(DELETE_EMAIL, DELETE_PASSWORD);
    cy.visit("/dashboard/account");
    cy.contains("button", /Delete Account/i).click();
    cy.contains(/cannot be undone|permanently/i).should("be.visible");
    cy.findByRole("button", { name: "Delete" }).should("be.visible");
    cy.findByRole("button", { name: /Cancel/i }).click();
    cy.contains("Account Settings").should("be.visible");
  });

  context("Mobile viewport", () => {
    beforeEach(function () {
      if (Cypress.env("SKIP_DELETE_TESTS")) {
        this.skip();
      }
    });

    it("shows Delete Account section on mobile", () => {
      cy.viewport(375, 667);
      cy.login(DELETE_EMAIL, DELETE_PASSWORD);
      cy.visit("/dashboard/account");
      cy.contains(/Delete Account/i).scrollIntoView().should("be.visible");
    });

    it("shows confirmation dialog on mobile", () => {
      cy.viewport(375, 667);
      cy.login(DELETE_EMAIL, DELETE_PASSWORD);
      cy.visit("/dashboard/account");
      cy.contains("button", /Delete Account/i).scrollIntoView().click();
      cy.contains(/cannot be undone|permanently/i).should("be.visible");
      cy.findByRole("button", { name: "Delete" }).should("be.visible");
      cy.findByRole("button", { name: /Cancel/i }).click();
    });
  });

  it("deletes account, clears session, and redirects to auth", () => {
    cy.login(DELETE_EMAIL, DELETE_PASSWORD);
    cy.visit("/dashboard/account");
    cy.contains("button", /Delete Account/i).click();
    cy.contains(/cannot be undone|permanently/i).should("be.visible");
    cy.findByRole("button", { name: "Delete" }).click();
    cy.url({ timeout: 10000 }).should("not.include", "/dashboard");
  });

  it("dashboard is inaccessible after account deletion", () => {
    cy.clearAllCookies();
    cy.visit("/dashboard", { failOnStatusCode: false });
    cy.url().should("not.include", "/dashboard");
  });
});
