describe("Coach Comments", () => {
  let logId: string;

  before(() => {
    cy.loginAsAthlete();
    // Clean up old E2E coach-comments logs
    cy.request("/api/logs").then((res) => {
      const logs = res.body.logs ?? [];
      logs
        .filter((l: { notes?: string }) => l.notes?.includes("E2E coach-comments"))
        .forEach((l: { id: string }) => {
          cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false });
        });
    });
    // Create a coach-shared log as athlete
    cy.request({
      method: "POST",
      url: "/api/logs",
      body: {
        emoji: "🎯",
        timestamp: new Date().toISOString(),
        visibility: "coach",
        notes: "E2E coach-comments log",
        tags: [],
      },
    }).then((res) => {
      logId = res.body.log?.id ?? res.body.log?._id;
      // Clean up previous E2E comments on this log
      if (logId) {
        cy.request(`/api/comments?logId=${logId}`).then((r) => {
          const comments = r.body.comments ?? [];
          comments
            .filter((c: { text?: string }) => c.text?.includes("E2E coach comment"))
            .forEach((c: { id: string }) => {
              cy.request({ method: "DELETE", url: `/api/comments?id=${c.id}`, failOnStatusCode: false });
            });
        });
      }
    });
  });

  after(() => {
    cy.loginAsAthlete();
    if (logId) {
      cy.request({ method: "DELETE", url: `/api/logs?id=${logId}`, failOnStatusCode: false });
    }
  });

  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard");
  });

  it("coach sees athlete's coach-shared log in feed", () => {
    cy.get("main").should("contain", "E2E coach-comments log");
  });

  it("coach sees Feedback toggle on athlete's log", () => {
    cy.contains('[role="button"]', "E2E coach-comments log").within(() => {
      cy.contains("Feedback").should("be.visible");
    });
  });

  it("coach can post a comment on athlete's log", () => {
    cy.contains('[role="button"]', "E2E coach-comments log").within(() => {
      cy.contains("Feedback").click();
      cy.get('textarea[placeholder="Leave feedback..."]').type(
        "E2E coach comment on athlete log",
      );
      cy.get('[aria-label="Send comment"]').click();
      cy.contains("E2E coach comment on athlete log").should("exist");
      cy.contains("Coach").should("exist");
    });
  });

  it("coach can delete own comment", () => {
    cy.contains('[role="button"]', "E2E coach-comments log").within(() => {
      cy.contains("Feedback").click();
      cy.contains("E2E coach comment on athlete log")
        .parents()
        .filter(':has([aria-label="Delete comment"])')
        .first()
        .trigger("mouseover")
        .within(() => {
          cy.get('[aria-label="Delete comment"]').click({ force: true });
        });
      cy.contains("E2E coach comment on athlete log").should("not.exist");
    });
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("coach sees athlete's log and Feedback toggle on mobile", () => {
      cy.get("main").should("contain", "E2E coach-comments log");
      cy.contains('[role="button"]', "E2E coach-comments log").within(() => {
        cy.contains("Feedback").should("be.visible");
      });
    });

    it("coach can expand comment section and post feedback on mobile", () => {
      cy.contains('[role="button"]', "E2E coach-comments log").within(() => {
        cy.contains("Feedback").click();
        cy.contains("Hide feedback").should("be.visible");
        cy.get('textarea[placeholder="Leave feedback..."]').type("E2E coach mobile comment");
        cy.get('[aria-label="Send comment"]').click();
        cy.contains("E2E coach mobile comment").should("exist");
      });
    });
  });
});
