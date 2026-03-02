describe("Athlete Feed", () => {
  beforeEach(() => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
  });

  it("shows Training Feed heading", () => {
    cy.contains("Training Feed").should("be.visible");
  });

  it("shows Filter by section on mobile viewport", () => {
    cy.viewport(375, 667);
    cy.contains("Filter by").should("be.visible");
  });

  it("shows feed content (empty state or log entries)", () => {
    cy.contains("Training Feed").should("be.visible");
    cy.get("main").should("be.visible");
  });

  it("shows New Log button", () => {
    cy.contains("button", "New Log").should("be.visible");
  });
});
