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
    if (!logId) return;
    cy.loginAsAthlete();
    cy.deleteLog(logId);
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

  it("guardian can see athlete's log emoji on monthly view", () => {
    cy.loginAsGuardian();
    cy.visit("/dashboard");
    cy.findByLabelText(/E2E Athlete/i).check();
    cy.findAllByRole("img", { name: "log mood" })
      .should("be.visible")
      .and("contain", "🏋️");
  });

  it("guardian can see athlete's log emoji on weekly view", () => {
    cy.loginAsGuardian();
    cy.visit("/dashboard");
    cy.findByLabelText(/E2E Athlete/i).check();
    cy.contains("button", "Week").click();
    cy.findAllByRole("img", { name: "log mood" })
      .should("be.visible")
      .and("contain", "🏋️");
  });
});
