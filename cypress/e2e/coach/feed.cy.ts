describe("Coach Feed", () => {
  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard");
  });

  it("shows Training Feed", () => {
    cy.contains("Training Feed").should("be.visible");
  });

  it("shows Filter by with role, athlete, review status, date", () => {
    cy.contains("All Roles").should("be.visible");
    cy.contains("All").should("be.visible");
    cy.contains("Pending").should("be.visible");
  });

  it("shows group navigation (Manage Group, Attendance)", () => {
    cy.viewport(1280, 720);
    cy.contains("Manage Group").should("be.visible");
    cy.contains("Attendance").should("be.visible");
  });
});
