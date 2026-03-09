describe("Coach Filters", () => {
  let logId: string;

  before(() => {
    cy.loginAsAthlete();
    // Clean up old fixture logs
    cy.request("/api/logs").then((res) => {
      const logs = res.body.logs ?? [];
      logs
        .filter((l: { notes?: string }) => l.notes?.includes("E2E coach-filter fixture"))
        .forEach((l: { id: string }) => {
          cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false });
        });
    });
    // Create a coach-shared log today so filters can act on it
    cy.createLog({
      emoji: "🎽",
      notes: "E2E coach-filter fixture",
      visibility: "coach",
      tags: ["e2e-coach-filter"],
      timestamp: new Date().toISOString(),
    }).then((log) => {
      logId = log?.id ?? log?._id;
    });
  });

  after(() => {
    cy.loginAsAthlete();
    if (logId) {
      cy.deleteLog(logId);
    }
  });

  describe("Desktop sidebar", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(1280, 900);
      cy.visit("/dashboard");
    });

    it("shows FILTER BY heading in sidebar", () => {
      cy.contains("FILTER BY").should("be.visible");
    });

    it("Role section expands to show All Roles option", () => {
      cy.contains("button", "Role").click();
      cy.contains("button", "All Roles").should("be.visible");
    });

    it("Athlete section expands to show an athlete option", () => {
      cy.contains("button", "Athlete").click();
      cy.contains("button", "All Athletes").should("be.visible");
    });

    it("Review Status section expands to show All, Pending, Reviewed, Revisit", () => {
      cy.contains("button", "Review Status").click();
      cy.contains("button", "All").should("be.visible");
      cy.contains("button", "Pending").should("be.visible");
      cy.contains("button", "Reviewed").should("be.visible");
      cy.contains("button", "Revisit").should("be.visible");
    });

    it("Date section expands to show All Time, Today, Last 7 Days, Last 30 Days", () => {
      cy.contains("button", "Date").click();
      cy.contains("button", "All Time").should("be.visible");
      cy.contains("button", "Today").should("be.visible");
      cy.contains("button", "Last 7 Days").should("be.visible");
      cy.contains("button", "Last 30 Days").should("be.visible");
    });

    it("clicking Today shows fixture log in feed", () => {
      cy.contains("button", "Date").click();
      cy.contains("button", "Today").click();
      cy.get("main").contains("E2E coach-filter fixture").should("be.visible");
    });

    it("clicking Pending shows fixture log (new logs default to pending)", () => {
      cy.contains("button", "Review Status").click();
      cy.contains("button", "Pending").click();
      cy.get("main").contains("E2E coach-filter fixture").should("be.visible");
    });

    it("Reset all filters clears active filters", () => {
      cy.contains("button", "Date").click();
      cy.contains("button", "Today").click();
      cy.findByRole("button", { name: "Reset all filters" }).click();
      cy.findByRole("button", { name: "Reset all filters" }).should("not.exist");
    });
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("shows Filter by heading on mobile", () => {
      cy.contains("Filter by").should("be.visible");
    });

    it("shows review status pills: All, Pending, Reviewed, Revisit", () => {
      cy.contains("button", "Pending").should("be.visible");
      cy.contains("button", "Reviewed").should("be.visible");
      cy.contains("button", "Revisit").should("be.visible");
    });

    it("shows date pills: Today, 7 Days, 30 Days", () => {
      cy.contains("button", "Today").should("be.visible");
      cy.contains("button", "7 Days").should("be.visible");
      cy.contains("button", "30 Days").should("be.visible");
    });

    it("clicking Today shows fixture log in feed", () => {
      cy.contains("button", "Today").click();
      cy.get("main").contains("E2E coach-filter fixture").should("be.visible");
    });
  });
});
