describe("Athlete Comments", () => {
  let logId: string;

  before(() => {
    cy.loginAsAthlete();
    // Clean up old E2E comment logs
    cy.request("/api/logs").then((res) => {
      const logs = res.body.logs ?? [];
      logs
        .filter((l: { notes?: string }) => l.notes?.includes("E2E athlete-comments"))
        .forEach((l: { id: string }) => {
          cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false });
        });
    });
    // Create a coach-shared log so the comment section is visible
    cy.request({
      method: "POST",
      url: "/api/logs",
      body: {
        emoji: "💬",
        timestamp: new Date().toISOString(),
        visibility: "coach",
        notes: "E2E athlete-comments log",
        tags: [],
      },
    }).then((res) => {
      logId = res.body.log?.id ?? res.body.log?._id;
      // Clean up comments from previous runs
      if (logId) {
        cy.request(`/api/comments?logId=${logId}`).then((r) => {
          const comments = r.body.comments ?? [];
          comments
            .filter((c: { text?: string }) => c.text?.includes("E2E comment"))
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
    cy.loginAsAthlete();
    cy.visit("/dashboard");
  });

  it("shows Feedback toggle on coach-shared log card", () => {
    cy.get("main").should("contain", "E2E athlete-comments log");
    cy.contains('[role="button"]', "E2E athlete-comments log").within(() => {
      cy.contains("Feedback").should("be.visible");
    });
  });

  it("can expand and collapse the comment section", () => {
    cy.contains('[role="button"]', "E2E athlete-comments log").within(() => {
      cy.contains("Feedback").click();
      cy.contains("Hide feedback").should("be.visible");
      cy.contains("Hide feedback").click();
      cy.contains("Feedback").should("be.visible");
    });
  });

  it("can post a comment on own log", () => {
    cy.contains('[role="button"]', "E2E athlete-comments log").within(() => {
      cy.contains("Feedback").click();
      cy.get('textarea[placeholder="Reply to coach..."]').type(
        "E2E comment from athlete",
      );
      cy.get('[aria-label="Send comment"]').click();
      cy.contains("E2E comment from athlete").should("be.visible");
    });
  });

  it("can edit own comment", () => {
    cy.contains('[role="button"]', "E2E athlete-comments log").within(() => {
      cy.contains("button", /feedback|comment/i).click();
      cy.contains('[data-testid="comment-item"]', "E2E comment from athlete")
        .trigger("mouseover")
        .within(() => {
          cy.get('[aria-label="Edit comment"]').click({ force: true });
          cy.get("textarea").clear().type("E2E comment edited");
          cy.get('[aria-label="Save edit"]').click();
        });
      cy.contains("E2E comment edited").should("be.visible");
    });
  });

  it("can delete own comment", () => {
    cy.contains('[role="button"]', "E2E athlete-comments log").within(() => {
      cy.contains("button", /feedback|comment/i).click();
      cy.contains('[data-testid="comment-item"]', "E2E comment edited")
        .trigger("mouseover")
        .within(() => {
          cy.get('[aria-label="Delete comment"]').click({ force: true });
        });
      cy.contains("E2E comment edited").should("not.exist");
    });
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsAthlete();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("shows Feedback toggle on coach-shared log card on mobile", () => {
      cy.get("main").should("contain", "E2E athlete-comments log");
      cy.contains('[role="button"]', "E2E athlete-comments log").within(() => {
        cy.contains("Feedback").should("be.visible");
      });
    });

    it("can expand the comment section and post a comment on mobile", () => {
      cy.contains('[role="button"]', "E2E athlete-comments log").within(() => {
        cy.contains("Feedback").click();
        cy.contains("Hide feedback").should("be.visible");
        cy.get('textarea[placeholder="Reply to coach..."]').type("E2E comment mobile");
        cy.get('[aria-label="Send comment"]').click();
        cy.contains("E2E comment mobile").should("be.visible");
      });
    });
  });
});
