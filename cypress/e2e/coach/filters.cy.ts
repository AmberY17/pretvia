describe("Coach Filters", () => {
  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard");
  });

  it("filters by review status", () => {
    cy.contains("Pending").click();
    cy.get('button[aria-label="Reset all filters"]').should("be.visible");
  });

  it("filters by date", () => {
    cy.contains("Today").click();
    cy.contains("Today").should("have.class", "bg-primary/10");
  });

  it("Reset clears all filters", () => {
    cy.contains("Pending").click();
    cy.get('button[aria-label="Reset all filters"]').click();
    cy.contains("All").should("have.class", "bg-primary/10");
  });
});
