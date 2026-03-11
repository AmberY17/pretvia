describe("Coach Check-in Sessions", () => {
  before(() => {
    cy.loginAsCoach();
    // Clean up existing E2E check-ins
    cy.request("/api/checkins?mode=all").then((res) => {
      const checkins = res.body.checkins ?? [];
      checkins
        .filter((c: { title?: string }) => c.title?.includes("E2E Checkin"))
        .forEach((c: { id: string }) => {
          cy.request({ method: "DELETE", url: `/api/checkins?id=${c.id}`, failOnStatusCode: false });
        });
    });
  });

  after(() => {
    cy.loginAsCoach();
    cy.request("/api/checkins?mode=all").then((res) => {
      const checkins = res.body.checkins ?? [];
      checkins
        .filter((c: { title?: string }) => c.title?.includes("E2E Checkin"))
        .forEach((c: { id: string }) => {
          cy.request({ method: "DELETE", url: `/api/checkins?id=${c.id}`, failOnStatusCode: false });
        });
    });
  });

  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard");
  });

  it("shows Create Session Check-In button on dashboard", () => {
    cy.contains("Create Session Check-In").should("be.visible");
  });

  it("can create a check-in session via the dashboard UI", () => {
    cy.contains("Create Session Check-In").click();
    cy.contains("New Session Check-In").should("be.visible");
    cy.findByLabelText(/Title/i).type("E2E Checkin Session");
    cy.contains("button", "Create").click();
    cy.contains("E2E Checkin Session").should("exist");
  });

  it("shows the check-in card with progress indicator", () => {
    cy.contains('[data-testid="checkin-card"]', "E2E Checkin Session").within(() => {
      cy.contains("Session Check-In").should("be.visible");
      cy.contains(/\d+\/\d+ checked in/).should("be.visible");
    });
  });

  it("can delete a check-in session with confirmation", () => {
    cy.contains('[data-testid="checkin-card"]', "E2E Checkin Session")
      .trigger("mouseover")
      .within(() => {
        cy.get('[aria-label="Remove check-in"]').click({ force: true });
      });
    cy.contains("This session check-in will be removed.").should("be.visible");
    cy.findByRole("button", { name: "Delete" }).click();
    cy.contains("E2E Checkin Session").should("not.exist");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("shows Create Session Check-In button on mobile", () => {
      cy.contains("Create Session Check-In").should("be.visible");
    });

    it("can create a check-in session on mobile", () => {
      cy.contains("Create Session Check-In").click();
      cy.contains("New Session Check-In").should("be.visible");
      cy.findByLabelText(/Title/i).type("E2E Checkin Mobile");
      cy.contains("button", "Create").click();
      cy.contains("E2E Checkin Mobile").should("exist");
    });

    it("check-in card shows progress indicator on mobile", () => {
      cy.contains('[data-testid="checkin-card"]', "E2E Checkin Mobile").within(() => {
        cy.contains("Session Check-In").should("be.visible");
        cy.contains(/\d+\/\d+ checked in/).should("be.visible");
      });
    });
  });
});
