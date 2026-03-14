describe("Athlete Feed", () => {
  beforeEach(() => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
  });

  it("shows Training Feed heading", () => {
    cy.contains("Training Feed").should("be.visible");
  });

  it("shows feed content (empty state or log entries)", () => {
    cy.contains("Training Feed").should("be.visible");
    cy.findByRole("main").should("be.visible");
  });

  it("shows New Log button", () => {
    cy.findByRole("button", { name: "New Log" }).should("be.visible");
  });

  it("shows FILTER BY sidebar on desktop", () => {
    cy.viewport(1280, 900);
    cy.visit("/dashboard");
    cy.contains("FILTER BY").should("be.visible");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsAthlete();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("shows Training Feed heading on mobile", () => {
      cy.contains("Training Feed").should("be.visible");
    });

    it("shows New Log button on mobile", () => {
      cy.findByRole("button", { name: "New Log" }).should("be.visible");
    });

    it("shows Filter by section with mobile date pills", () => {
      cy.contains("Filter by").should("be.visible");
      cy.contains("button", "Today").should("be.visible");
    });

    it("desktop sidebar filter heading is not visible on mobile", () => {
      cy.contains("FILTER BY").should("not.be.visible");
    });
  });
});
