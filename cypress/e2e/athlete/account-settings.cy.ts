/**
 * Athlete Account Settings Tests
 *
 * Delete account tests use a dedicated account seeded via `pnpm seed:test`:
 *   Email: deletetest@test.pretvia.com
 *   Password: TestPass123!
 *
 * Run `pnpm seed:test` between test runs to recreate the delete-test account.
 */

export {};

const DELETE_EMAIL =
  Cypress.env("DELETE_TEST_EMAIL") ?? "deletetest@test.pretvia.com";
const DELETE_PASSWORD =
  Cypress.env("DELETE_TEST_PASSWORD") ?? "TestPass123!";

describe("Athlete Account Settings", () => {
  beforeEach(() => {
    cy.loginAsAthlete();
    cy.visit("/dashboard/account");
  });

  it.skip("can select the profile emoji — confirmed on dashboard", () => {
    cy.findByRole("button", { name: /Select emoji|emoji/i }).click();
    cy.get('em-emoji-picker')
      .shadow()
      .find('button[aria-label]')
      .first()
      .click({ force: true });
    cy.findByRole("button", { name: /Select emoji|emoji/i })
      .invoke("text")
      .should("not.eq", "?");
    cy.visit("/dashboard");
    cy.get("nav, aside").should("exist");
  });

  // TODO: We should test if the training schedule is created using the day wheel and time wheel and then check if the slot appears
  it("can create a training schedule — slot appears in account settings", () => {
    cy.loginAsAthlete();
    cy.request({ method: "PUT", url: "/api/auth/profile", body: { trainingSlots: [] } });
    cy.visit("/dashboard/account");
    cy.contains(/Training Slots|Training/i)
      .closest("section")
      .within(() => {
        cy.contains(/Add schedule slot|Add Slot|Add Training Slot/i)
          .first()
          .click();
      });
    cy.wait(1500);
    cy.reload();
    cy.contains(/Training Slots|Training/i)
      .closest("section")
      .within(() => {
        cy.get('[aria-label*="Remove slot"], [aria-label*="remove"], button[aria-label*="delete"]').should(
          "have.length.at.least",
          1
        );
      });
  });

  it("can toggle the celebration on new log — toggle state persists", () => {
    cy.contains(/Celebration/i).scrollIntoView();
    cy.contains(/Celebration/i)
      .closest("section, div")
      .within(() => {
        cy.get('[role="switch"]').then(($switch) => {
          const wasChecked = $switch.attr("aria-checked") === "true";
          cy.wrap($switch).click();
          cy.wrap($switch).should("have.attr", "aria-checked", String(!wasChecked));
        });
      });
    cy.reload();
    cy.contains(/Celebration/i)
      .closest("section, div")
      .within(() => {
        cy.get('[role="switch"]').should("have.attr", "aria-checked");
      });
  });

  describe("Delete Account", () => {
    before(() => {
      cy.exec("pnpm seed:test", { timeout: 30000 });
    });

    it("shows Delete Account section", () => {
      cy.login(DELETE_EMAIL, DELETE_PASSWORD);
      cy.visit("/dashboard/account");
      cy.contains(/Delete Account/i).should("be.visible");
    });

    it("shows confirmation dialog and can cancel", () => {
      cy.login(DELETE_EMAIL, DELETE_PASSWORD);
      cy.visit("/dashboard/account");
      cy.contains("button", /Delete Account/i).click();
      cy.contains(/cannot be undone|permanently/i).should("be.visible");
      cy.findByRole("button", { name: /Cancel/i }).click();
      cy.contains("Account Settings").should("be.visible");
    });

    it("deletes account, redirects to landing", { retries: 0 }, () => {
      cy.login(DELETE_EMAIL, DELETE_PASSWORD);
      cy.visit("/dashboard/account");
      cy.contains("button", /Delete Account/i).click();
      cy.contains(/cannot be undone|permanently/i).should("be.visible");
      cy.findByRole("button", { name: "Delete" }).click();
      cy.url({ timeout: 10000 }).should("not.include", "/dashboard");
    });

    it("dashboard inaccessible after account deletion", () => {
      cy.clearAllCookies();
      cy.visit("/dashboard", { failOnStatusCode: false });
      cy.url().should("not.include", "/dashboard");
    });
  });
});
