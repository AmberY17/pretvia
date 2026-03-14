describe("Athlete Edit and Delete Log", () => {
  before(() => {
    cy.loginAsAthlete();
    cy.request({
      method: "POST",
      url: "/api/logs",
      body: {
        emoji: "\u{1F4AA}",
        timestamp: new Date().toISOString(),
        visibility: "coach",
        notes: "E2E edit-delete test",
        tags: ["e2e-edit-delete"],
      },
      failOnStatusCode: false,
    });
  });

  beforeEach(() => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
  });

  it("opens log panel when clicking a log card", () => {
    cy.get("main").should("contain", "E2E edit-delete test");
    cy.contains("E2E edit-delete test").click();
    cy.contains("Log Details").should("be.visible");
  });

  it("shows edit and delete on hover for own log", () => {
    cy.contains('[role="button"]', "E2E edit-delete test").trigger("mouseover");
    cy.contains('[role="button"]', "E2E edit-delete test").within(() => {
      cy.get('[aria-label="Edit log"]').should("be.visible");
      cy.get('[aria-label="Delete log"]').should("be.visible");
    });
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsAthlete();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("log card is visible and tappable on mobile", () => {
      cy.get("main").should("contain", "E2E edit-delete test");
      cy.contains('[role="button"]', "E2E edit-delete test").should("be.visible");
    });

    it("tapping a log card opens the detail panel with Edit and Delete on mobile", () => {
      // On mobile, hover-based edit/delete is not accessible;
      // use the detail panel opened by tapping the card
      cy.contains('[role="button"]', "E2E edit-delete test").click();
      cy.findByRole("heading", { name: "Log Details" }).should("be.visible");
      cy.findByRole("button", { name: "Edit" }).should("be.visible");
      cy.findByRole("button", { name: "Delete" }).should("be.visible");
    });
  });
});
