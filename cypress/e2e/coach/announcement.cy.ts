describe("Coach Announcement", () => {
  before(() => {
    cy.loginAsCoach();
    cy.request("/api/announcements").then((res) => {
      const announcements = res.body.announcements ?? [];
      const e2e = announcements.filter(
        (a: { text?: string }) =>
          a.text?.includes("E2E announcement - delete me") ||
          a.text?.includes("E2E announcement updated")
      );
      e2e.forEach((a: { id: string }) => {
        cy.request("DELETE", `/api/announcements?id=${a.id}`);
      });
    });
  });

  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard");
  });

  it("shows New Announcement button", () => {
    cy.contains("button", "New Announcement").should("be.visible");
  });

  it("can post, edit in place, and delete announcement", () => {
    cy.contains("button", "New Announcement").click();
    cy.findByPlaceholderText(/announcement/).type(
      "E2E announcement - delete me"
    );
    cy.findByRole("button", { name: "Post" }).click();
    cy.get("main").should("contain", "E2E announcement - delete me");

    cy.contains("E2E announcement - delete me")
      .parent()
      .within(() => {
        cy.findByRole("button", { name: "Edit announcement" }).click({
          force: true,
        });
      });
    cy.findByRole("textbox").first().clear().type("E2E announcement updated");
    cy.findByRole("button", { name: "Save" }).click();
    cy.get("main").should("contain", "E2E announcement updated");

    cy.contains("E2E announcement updated")
      .parent()
      .within(() => {
        cy.findByRole("button", { name: "Remove announcement" }).click({
          force: true,
        });
      });
    cy.findByRole("button", { name: "Delete" }).click();
    cy.get("main").should("not.contain", "E2E announcement updated");
  });
});
