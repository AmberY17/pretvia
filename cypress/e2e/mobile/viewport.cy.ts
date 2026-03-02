describe("Mobile Viewport", () => {
  beforeEach(() => {
    cy.viewport(375, 667);
  });

  it("athlete feed shows filter section", () => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");

    cy.contains("Training Feed").should("be.visible");
  });

  it("coach sees hamburger menu", () => {
    cy.loginAsCoach();
    cy.visit("/dashboard");
    cy.get('button[aria-label="Open menu"]').should("be.visible");
  });

  it("coach hamburger opens nav popover", () => {
    cy.loginAsCoach();
    cy.visit("/dashboard");
    cy.get('button[aria-label="Open menu"]').click();
    cy.contains("Manage Group").should("be.visible");
    cy.contains("Attendance").should("be.visible");
    cy.contains("Sign out").should("be.visible");
  });
});
