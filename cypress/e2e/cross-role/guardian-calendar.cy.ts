describe("Cross-Role: Guardian Sees Athlete Log on Calendar", () => {
  let logId: string;

  before(() => {
    cy.loginAsAthlete();
    cy.request("/api/logs").then((res) => {
      (res.body.logs ?? [])
        .filter((l: { notes?: string; id?: string; _id?: string }) => l.notes?.includes("E2E guardian calendar"))
        .forEach((l: { id?: string; _id?: string }) => cy.deleteLog(l.id ?? l._id ?? ""));
    });
    cy.createLog({
      emoji: "🏋️",
      notes: "E2E guardian calendar",
      visibility: "coach",
      timestamp: new Date().toISOString(),
      tags: [],
    }).then((log) => {
      logId = log?.id ?? log?._id;
    });
  });

  after(() => {
    cy.loginAsAthlete();
    if (logId) cy.deleteLog(logId);
  });

  it("guardian sees athlete's log emoji on today's calendar date", () => {
    cy.loginAsGuardian();
    cy.visit("/dashboard");
    cy.contains("Training Feed").should("not.exist");
    cy.findByLabelText(/E2E Athlete/i).check();
    cy.findAllByRole("img", { name: "log mood" })
      .should("be.visible")
      .and("contain", "🏋️");
  });

  context("Mobile viewport", () => {
    it("guardian sees athlete emoji on calendar on mobile", () => {
      cy.viewport(375, 667);
      cy.loginAsGuardian();
      cy.visit("/dashboard");
      cy.findByRole("button", { name: /select athletes/i }).click();
      cy.findAllByLabelText(/E2E Athlete/i).filter(":visible").first().check();
      cy.findAllByRole("img", { name: "log mood" })
        .should("be.visible")
        .and("contain", "🏋️");
    });
  });
});
