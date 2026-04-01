import "@testing-library/cypress/add-commands";
import "./commands";

before(() => {
  cy.task("cleanupTestData");
});

// Skip the onboarding modal in all tests by pre-setting the localStorage flag.
beforeEach(() => {
  cy.on("window:before:load", (win) => {
    win.localStorage.setItem("pretvia-onboarded", "1");
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
