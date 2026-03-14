describe("Logout", () => {
  it("redirects to landing after sign out from dashboard", () => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
    cy.contains("Training Feed").should("be.visible");
    cy.findByRole("button", { name: "Sign Out" }).click();
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  it("clears session - dashboard redirects to auth when revisiting", () => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
    cy.contains("Training Feed").should("be.visible");
    cy.findByRole("button", { name: "Sign Out" }).click();
    cy.clearAllCookies();
    cy.visit("/dashboard");
    cy.url().should("include", "/auth");
  });

  context("Mobile viewport — Coach", () => {
    // Coach Sign Out on mobile is via the hamburger menu popover.
    // Full navigation flow (including Sign Out) is covered in mobile/navigation.cy.ts.
    // This context verifies the session is cleared after signing out via hamburger.
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("signing out via hamburger menu clears session", () => {
      cy.findByRole("button", { name: "Open menu" }).click();
      cy.contains("Sign out").click();
      cy.url().should("not.include", "/dashboard");
      cy.clearAllCookies();
      cy.visit("/dashboard");
      cy.url().should("include", "/auth");
    });
  });
});
