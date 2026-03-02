describe("Athlete Filters", () => {
  beforeEach(() => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
  });

  it("shows tag filter pills", () => {
    cy.viewport(375, 667);
    cy.contains("Filter by").should("be.visible");
  });

  it("shows date filter with All, Today, 7 Days, 30 Days", () => {
    cy.contains("All").should("be.visible");
    cy.contains("Today").should("be.visible");
    cy.contains("7 Days").should("be.visible");
    cy.contains("30 Days").should("be.visible");
  });

  it("has Reset button when filters are active", () => {
    cy.contains("Today").click();
    cy.get('button[aria-label="Reset all filters"]').should("be.visible");
  });

  it("Reset clears filters", () => {
    cy.contains("Today").click();
    cy.get('button[aria-label="Reset all filters"]').click();
    cy.contains("All").should("have.class", "bg-primary/10");
  });
});
