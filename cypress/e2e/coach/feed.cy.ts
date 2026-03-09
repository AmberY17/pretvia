describe("Coach Feed", () => {
  beforeEach(() => {
    cy.loginAsCoach();
    cy.viewport(1280, 900);
    cy.visit("/dashboard");
  });

  it("shows Training Feed", () => {
    cy.contains("Training Feed").should("be.visible");
  });

  it("shows group navigation links in sidebar", () => {
    cy.contains("Manage Group").should("be.visible");
    cy.contains("Attendance").should("be.visible");
  });

  it("shows FILTER BY heading in sidebar", () => {
    cy.contains("FILTER BY").should("be.visible");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("shows Training Feed on mobile", () => {
      cy.contains("Training Feed").should("be.visible");
    });

    it("shows hamburger Open menu button instead of sidebar nav", () => {
      cy.findByRole("button", { name: "Open menu" }).should("be.visible");
    });

    it("sidebar nav links are not visible on mobile", () => {
      cy.contains("Manage Group").should("not.be.visible");
      cy.contains("Attendance").should("not.be.visible");
    });

    it("shows mobile filter pills (Pending, Reviewed) instead of sidebar", () => {
      cy.contains("Filter by").should("be.visible");
      cy.contains("button", "Pending").should("be.visible");
    });

    it("desktop FILTER BY heading is not visible on mobile", () => {
      cy.contains("FILTER BY").should("not.be.visible");
    });
  });
});
