describe("Coach Athlete Management", () => {
  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard/group");
  });

  it("shows Athletes section on the group management page", () => {
    cy.contains(/Athletes/i).should("be.visible");
  });

  it("shows the test athlete in the athletes list", () => {
    cy.contains(/E2E Athlete|athlete@test/i).should("be.visible");
  });

  it("can search for athletes by name", () => {
    cy.get('input[placeholder*="athlete"], input[placeholder*="Search"], input[placeholder*="search"]')
      .first()
      .type("E2E Athlete");
    cy.contains(/E2E Athlete/i).should("be.visible");
  });

  it("can assign a role to an athlete", () => {
    cy.contains('[data-testid="athlete-row"]', /E2E Athlete|athlete@test/i).within(() => {
      cy.contains("button", /No roles|roles/i).should("be.visible");
    });
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(375, 667);
      cy.visit("/dashboard/group");
    });

    it("shows Athletes section on mobile", () => {
      cy.contains(/Athletes/i).should("be.visible");
    });

    it("shows the test athlete in the list on mobile", () => {
      cy.contains(/E2E Athlete|athlete@test/i).should("be.visible");
    });

    it("can search for athletes on mobile", () => {
      cy.get('input[placeholder*="athlete"], input[placeholder*="Search"], input[placeholder*="search"]')
        .first()
        .type("E2E Athlete");
      cy.contains('[data-testid="athlete-row"]', /E2E Athlete/i).should("be.visible");
    });
  });
});
