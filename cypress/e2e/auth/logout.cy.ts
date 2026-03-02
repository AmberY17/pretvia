describe("Logout", () => {
  it("redirects to landing after sign out from dashboard", () => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
    cy.contains("Training Feed").should("be.visible");
    cy.contains("button", "Sign Out").click();
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  it("clears session - dashboard redirects to auth when revisiting", () => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
    cy.contains("Training Feed").should("be.visible");
    cy.contains("button", "Sign Out").click();
    cy.visit("/dashboard");
    cy.url().should("include", "/auth");
  });
});
