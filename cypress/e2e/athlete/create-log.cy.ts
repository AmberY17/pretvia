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
    // Notes use line-clamp; assert text exists in main (avoids clipped-element visibility failure)
    cy.get("main").should("contain", "E2E create-log test");
    cy.viewport(375, 667);
    cy.contains("e2e-create").should("be.visible");
  });
});
