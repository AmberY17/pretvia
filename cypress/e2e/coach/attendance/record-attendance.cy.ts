describe("Coach Record Attendance", () => {
  let checkinId: string;

  before(() => {
    cy.loginAsCoach();
    // Clean up old E2E check-ins
    cy.request("/api/checkins?mode=all").then((res) => {
      const checkins = res.body.checkins ?? [];
      checkins
        .filter((c: { title?: string }) => c.title?.includes("E2E Attendance"))
        .forEach((c: { id: string }) => {
          cy.request({ method: "DELETE", url: `/api/checkins?id=${c.id}`, failOnStatusCode: false });
        });
    });
    // Create a check-in session for attendance recording
    cy.request({
      method: "POST",
      url: "/api/checkins",
      body: {
        sessionDate: new Date().toISOString(),
        title: "E2E Attendance Session",
      },
    }).then((res) => {
      checkinId = res.body.checkin?.id ?? res.body.checkin?._id;
    });
  });

  after(() => {
    cy.loginAsCoach();
    if (checkinId) {
      cy.request({ method: "DELETE", url: `/api/checkins?id=${checkinId}`, failOnStatusCode: false });
    }
  });

  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard/attendance");
  });

  it("shows the Attendance page with the created session", () => {
    cy.contains("Attendance").should("be.visible");
    cy.contains("E2E Attendance Session").should("be.visible");
  });

  it("shows athlete list with attendance buttons", () => {
    cy.contains("E2E Attendance Session").should("be.visible");
    cy.get('button[title="Present"]').should("have.length.at.least", 1);
    cy.get('button[title="Absent"]').should("have.length.at.least", 1);
    cy.get('button[title="Excused"]').should("have.length.at.least", 1);
  });

  it("can mark athlete as present", () => {
    cy.get('button[title="Present"]').first().click();
    cy.get('button[title="Present"]').first().should("have.class", "text-green-600");
  });

  it("can change status from present to absent", () => {
    cy.get('button[title="Present"]').first().click();
    cy.get('button[title="Absent"]').first().click();
    cy.get('button[title="Absent"]').first().should("have.class", "text-red-600");
  });

  it("can mark athlete as excused", () => {
    cy.get('button[title="Excused"]').first().click();
    cy.get('button[title="Excused"]').first().should("have.class", "text-amber-600");
  });

  it("can save attendance", () => {
    cy.get('button[title="Present"]').first().click();
    cy.contains("button", "Save Attendance").click();
    cy.contains("E2E Attendance Session").should("be.visible");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(375, 667);
      cy.visit("/dashboard/attendance");
    });

    it("shows Attendance page and session on mobile", () => {
      cy.contains("Attendance").should("be.visible");
      cy.contains("E2E Attendance Session").should("be.visible");
    });

    it("shows attendance buttons for athletes on mobile", () => {
      cy.get('button[title="Present"]').should("have.length.at.least", 1);
      cy.get('button[title="Absent"]').should("have.length.at.least", 1);
      cy.get('button[title="Excused"]').should("have.length.at.least", 1);
    });

    it("can mark athlete present and save on mobile", () => {
      cy.get('button[title="Present"]').first().click();
      cy.contains("button", "Save Attendance").click();
      cy.contains("E2E Attendance Session").should("be.visible");
    });
  });
});
