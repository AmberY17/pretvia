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
    cy.contains("Edit Log").should("be.visible");
  });

  it("shows edit and delete on hover for own log", () => {
    cy.contains("E2E edit-delete test").parent().trigger("mouseover");
    // Scope to the log card (notes and edit/delete share a common ancestor)
    cy.contains("E2E edit-delete test").parent().parent().within(() => {
      cy.get('button[aria-label="Edit log"]').should("be.visible");
      cy.get('button[aria-label="Delete log"]').should("be.visible");
    });
  });
});
