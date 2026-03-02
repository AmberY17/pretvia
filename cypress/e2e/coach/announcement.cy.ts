describe("Coach Announcement", () => {
  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard");
  });

  it("shows New Announcement button", () => {
    cy.contains("button", "New Announcement").should("be.visible");
  });

  it("can post, edit in place, and delete announcement", () => {
    cy.contains("button", "New Announcement").click();
    cy.get("textarea[placeholder*='announcement']").type(
      "E2E announcement - delete me"
    );
    cy.contains("button", "Post").click();
    cy.contains("E2E announcement - delete me").should("be.visible");

    cy.get('button[aria-label="Edit announcement"]').first().click({ force: true });
    cy.get("textarea").first().clear().type("E2E announcement updated");
    cy.contains("button", "Save").click();
    cy.contains("E2E announcement updated").should("be.visible");

    cy.get('button[aria-label="Remove announcement"]').first().click({ force: true });
    cy.contains("button", "Delete").click();
    cy.contains("E2E announcement updated").should("not.exist");
  });
});
