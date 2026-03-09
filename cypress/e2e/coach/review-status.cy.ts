describe("Coach Review Status", () => {
  before(() => {
    cy.loginAsAthlete();
    cy.request("/api/logs").then((res) => {
      const logs = res.body.logs ?? [];
      const e2e = logs.filter(
        (l: { notes?: string }) => l.notes === "E2E coach review test"
      );
      e2e.forEach((l: { id: string }) => {
        cy.request("DELETE", `/api/logs?id=${l.id}`);
      });
    });
    cy.loginAsAthlete();
    cy.request({
      method: "POST",
      url: "/api/logs",
      body: {
        emoji: "\u{1F4AA}",
        timestamp: new Date().toISOString(),
        visibility: "coach",
        notes: "E2E coach review test",
        tags: [],
      },
    }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard");
  });

  it("shows review status badge on shared log", () => {
    cy.contains("E2E coach review test").should("be.visible");
    cy.contains("Pending").should("be.visible");
  });

  it("can change status via dropdown", () => {
    cy.contains('[role="button"]', "E2E coach review test").within(() => {
      cy.contains("Pending").click();
    });
    cy.contains("Reviewed").click();
    cy.contains('[role="button"]', "E2E coach review test").within(() => {
      cy.contains("Reviewed").should("be.visible");
    });
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("shows review status badge on shared log on mobile", () => {
      cy.get("main").should("contain", "E2E coach review test");
      cy.contains('[role="button"]', "E2E coach review test").within(() => {
        cy.contains(/Pending|Reviewed|Revisit/i).should("be.visible");
      });
    });

    it("can change review status from mobile", () => {
      cy.contains('[role="button"]', "E2E coach review test").within(() => {
        cy.contains(/Pending|Reviewed|Revisit/i).click();
      });
      cy.contains("Pending").should("be.visible");
    });
  });
});
