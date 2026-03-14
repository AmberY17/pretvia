describe("Athlete Log Detail", () => {
  before(() => {
    cy.loginAsAthlete();
    // Clean up any previous E2E test logs
    cy.request("/api/logs").then((res) => {
      const logs = res.body.logs ?? [];
      logs
        .filter(
          (l: { notes?: string }) =>
            l.notes?.includes("E2E log-detail") ||
            l.notes?.includes("E2E panel-delete"),
        )
        .forEach((l: { id: string }) => {
          cy.request("DELETE", `/api/logs?id=${l.id}`);
        });
    });
    // Create a test log with known content
    cy.request({
      method: "POST",
      url: "/api/logs",
      body: {
        emoji: "💪",
        timestamp: new Date().toISOString(),
        visibility: "coach",
        notes: "E2E log-detail fixture",
        tags: ["e2e-detail-tag"],
      },
    });
  });

  after(() => {
    cy.loginAsAthlete();
    cy.request("/api/logs").then((res) => {
      const logs = res.body.logs ?? [];
      logs
        .filter(
          (l: { notes?: string }) =>
            l.notes?.includes("E2E log-detail") ||
            l.notes?.includes("E2E panel-delete"),
        )
        .forEach((l: { id: string }) => {
          cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false });
        });
    });
  });

  beforeEach(() => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
  });

  it("opens log detail panel when clicking a log card", () => {
    cy.get("main").should("contain", "E2E log-detail fixture");
    cy.contains("E2E log-detail fixture").click();
    cy.contains("Log Details").should("be.visible");
  });

  it("shows notes and tags in the detail panel", () => {
    cy.contains("E2E log-detail fixture").click();
    cy.contains("Log Details").should("be.visible");
    cy.contains("E2E log-detail fixture").should("be.visible");
    cy.get("main").contains("e2e-detail-tag").should("exist");
  });

  it("shows visibility badge for athlete's own log", () => {
    cy.contains("E2E log-detail fixture").click();
    cy.contains("Log Details").should("be.visible");
    cy.contains(/Shared|Only me/i).should("exist");
  });

  it("shows Edit and Delete buttons in the detail panel", () => {
    cy.contains("E2E log-detail fixture").click();
    cy.contains("Log Details").should("be.visible");
    cy.contains("button", "Edit").should("be.visible");
    cy.contains("button", "Delete").should("be.visible");
  });

  it("can edit log notes and save via detail panel", () => {
    cy.contains("E2E log-detail fixture").click();
    cy.contains("Log Details").should("be.visible");
    cy.contains("button", "Edit").click();
    cy.contains("Edit Log").should("be.visible");
    cy.get("textarea#notes").first().scrollIntoView().clear().type("E2E log-detail updated notes");
    cy.contains("button", "Update Log").click();
    cy.get("main", { timeout: 15000 }).should("contain", "E2E log-detail updated notes");
  });

  it("can delete a log via the detail panel with confirmation", () => {
    cy.request({
      method: "POST",
      url: "/api/logs",
      body: {
        emoji: "🗑️",
        timestamp: new Date().toISOString(),
        visibility: "private",
        notes: "E2E panel-delete me",
        tags: [],
      },
    });
    cy.reload();
    cy.contains("E2E panel-delete me").click();
    cy.contains("Log Details").should("be.visible");
    cy.contains("button", "Delete").click();
    cy.contains("This log entry will be permanently removed.").should(
      "be.visible",
    );
    cy.findByRole("button", { name: "Delete" }).click();
    cy.get("main").should("not.contain", "E2E panel-delete me");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsAthlete();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("tapping a log card opens the detail panel on mobile", () => {
      cy.get("main").should("contain", "E2E log-detail");
      cy.contains('[role="button"]', "E2E log-detail").click();
      cy.findByRole("heading", { name: "Log Details" }).should("be.visible");
    });

    it("shows notes, tags, Edit and Delete in the panel on mobile", () => {
      cy.contains('[role="button"]', "E2E log-detail").click();
      cy.findByRole("heading", { name: "Log Details" }).should("be.visible");
      cy.get("main").contains("e2e-detail-tag").should("exist");
      cy.findByRole("button", { name: "Edit" }).should("be.visible");
      cy.findByRole("button", { name: "Delete" }).should("be.visible");
    });
  });
});
