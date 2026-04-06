import "@testing-library/cypress/add-commands";
import "./commands";

before(() => {
  cy.task("cleanupTestData");
});

// Skip onboarding UI in all tests by pre-setting localStorage flags (scoped per user).
// Set the Vercel Flags override cookie so tests always run with beta=true
beforeEach(() => {
  cy.setCookie("__vercel_flags_overrides", Cypress.env("betaFlagCookie"));
});

beforeEach(() => {
  cy.on("window:before:load", (win) => {
    const userId = Cypress.env("CURRENT_USER_ID") as string | undefined;
    if (userId) {
      win.localStorage.setItem(`pretvia-onboarded-${userId}`, "1");
      win.localStorage.setItem(`pretvia-coach-onboarding-done-${userId}`, "1");
    }
  });
});

// Suppress React hydration mismatch errors that Next.js throws in dev mode.
// These are cosmetic in development — React recovers automatically — but
// Cypress treats them as uncaught exceptions and fails the test.
Cypress.on("uncaught:exception", (err) => {
  if (
    err.message.includes("Hydration failed") ||
    err.message.includes("There was an error while hydrating") ||
    err.message.includes("hydration") ||
    err.message.includes("Minified React error")
  ) {
    return false;
  }
});
