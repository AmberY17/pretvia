describe("Group Management (Coach)", () => {
  beforeEach(() => {
    cy.loginAsCoach();
  });

  it("can navigate to Manage Group", () => {
    cy.visit("/dashboard");
    cy.contains("Manage Group").click();
    cy.url().should("include", "/dashboard/group");
  });

  it("shows group page with roles and athletes sections", () => {
    cy.visit("/dashboard/group");
    cy.contains("Group").should("be.visible");
    cy.contains(/Roles|Athletes/).should("be.visible");
  });

  it("can add a role", () => {
    cy.visit("/dashboard/group");
    cy.contains("Add Role").should("be.visible");
  });
});
