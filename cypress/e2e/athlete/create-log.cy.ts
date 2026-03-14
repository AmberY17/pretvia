describe("Athlete Create Log", () => {
  beforeEach(() => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
  });

  it("opens new log panel when clicking New Log", () => {
    cy.findByRole("button", { name: "New Log" }).click();
    cy.contains("New Log Entry").should("be.visible");
    cy.findByRole("button", { name: "Select emoji" }).should("be.visible");
  });

  it("creates a log via API and verifies it appears in feed", () => {
    cy.request({
      method: "POST",
      url: "/api/logs",
      body: {
        emoji: "\u{1F4AA}",
        timestamp: new Date().toISOString(),
        visibility: "coach",
        notes: "E2E create-log test",
        tags: ["e2e-create"],
      },
    }).then((res) => expect(res.status).to.eq(200));

    cy.reload();
    cy.get("main").should("contain", "E2E create-log test");
    cy.get("main").contains("e2e-create").should("exist");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsAthlete();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("New Log button is visible on mobile", () => {
      cy.findByRole("button", { name: /new log/i }).should("be.visible");
    });

    it("opens new log panel on mobile", () => {
      cy.findByRole("button", { name: /new log/i }).click();
      cy.findByRole("heading", { name: /New Log Entry/i }).should("be.visible");
      cy.findByRole("button", { name: "Select emoji" }).should("be.visible");
    });

    it("log created via API is visible in feed on mobile", () => {
      cy.request({
        method: "POST",
        url: "/api/logs",
        body: {
          emoji: "\u{1F4AA}",
          timestamp: new Date().toISOString(),
          visibility: "coach",
          notes: "E2E create-log mobile test",
          tags: ["e2e-create-mobile"],
        },
      }).then((res) => expect(res.status).to.eq(200));

      cy.reload();
      cy.get("main").should("contain", "E2E create-log mobile test");
      cy.get("main").contains("e2e-create-mobile").should("be.visible");
    });
  });
});
