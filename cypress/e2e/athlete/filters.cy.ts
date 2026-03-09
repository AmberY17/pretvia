describe("Athlete Filters", () => {
  let logId: string;

  before(() => {
    cy.loginAsAthlete();
    // Clean up old fixture logs
    cy.request("/api/logs").then((res) => {
      const logs = res.body.logs ?? [];
      logs
        .filter((l: { notes?: string }) => l.notes?.includes("E2E filter fixture"))
        .forEach((l: { id: string }) => {
          cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false });
        });
    });
    // Create fixture log with tag and today's date
    cy.createLog({
      emoji: "🏋️",
      notes: "E2E filter fixture",
      visibility: "coach",
      tags: ["e2e-filter-tag"],
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
      cy.loginAsAthlete();
      cy.viewport(1280, 900);
      cy.visit("/dashboard");
    });

    it("shows FILTER BY heading in sidebar", () => {
      cy.contains("FILTER BY").should("be.visible");
    });

    it("Tags section expands to show e2e-filter-tag pill", () => {
      cy.contains("button", "Tags").click();
      cy.contains("button", "e2e-filter-tag").should("be.visible");
    });

    it("clicking tag pill filters the log feed to show fixture log", () => {
      cy.contains("button", "Tags").click();
      cy.contains("button", "e2e-filter-tag").click();
      cy.get("main").contains("E2E filter fixture").should("be.visible");
    });

    it("Reset all filters clears tag filter", () => {
      cy.contains("button", "Tags").click();
      cy.contains("button", "e2e-filter-tag").click();
      cy.findByRole("button", { name: "Reset all filters" }).click();
      cy.findByRole("button", { name: "Reset all filters" }).should("not.exist");
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
      cy.get("main").contains("E2E filter fixture").should("be.visible");
    });

    it("clicking All Time after Today clears date filter", () => {
      cy.contains("button", "Date").click();
      cy.contains("button", "Today").click();
      cy.contains("button", "All Time").click();
      cy.findByRole("button", { name: "Reset all filters" }).should("not.exist");
    });
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsAthlete();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("shows Filter by heading on mobile", () => {
      cy.contains("Filter by").should("be.visible");
    });

    it("shows mobile date pills: All, Today, 7 Days, 30 Days", () => {
      cy.contains("button", "All").should("be.visible");
      cy.contains("button", "Today").should("be.visible");
      cy.contains("button", "7 Days").should("be.visible");
      cy.contains("button", "30 Days").should("be.visible");
    });

    it("clicking Today shows fixture log in feed", () => {
      cy.contains("button", "Today").click();
      cy.get("main").contains("E2E filter fixture").should("be.visible");
    });

    it("clicking All after Today clears date filter", () => {
      cy.contains("button", "Today").click();
      cy.findByRole("button", { name: "Reset all filters" }).click();
      cy.findByRole("button", { name: "Reset all filters" }).should("not.exist");
    });
  });
});
