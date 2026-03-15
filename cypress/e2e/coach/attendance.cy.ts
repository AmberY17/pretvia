describe("Coach Attendance", () => {
  function cleanupAttendanceSessions() {
    cy.loginAsCoach()
    cy.request("/api/checkins?mode=all").then((res) => {
      const checkins = res.body.checkins ?? []
      checkins
        .filter((c: { title?: string }) => c.title?.includes("E2E Attendance"))
        .forEach((c: { id: string }) => {
          cy.request({ method: "DELETE", url: `/api/checkins?id=${c.id}`, failOnStatusCode: false })
        })
    })
  }

  before(() => {
    cleanupAttendanceSessions()
    cy.loginAsCoach()
    cy.createCheckin({ title: "E2E Attendance Session A" })
    cy.createCheckin({ title: "E2E Attendance Session B" })
  })

  after(() => {
    cleanupAttendanceSessions()
  })

  beforeEach(() => {
    cy.loginAsCoach()
    cy.visit("/dashboard/attendance")
  })

  it("shows both sessions on the attendance page", () => {
    cy.contains("button", /E2E Attendance/i).click()
    cy.contains("E2E Attendance Session A").should("be.visible")
    cy.contains("E2E Attendance Session B").should("be.visible")
  })

  it("can select a session from the dropdown", () => {
    cy.contains("button", /E2E Attendance/i).click()
    cy.contains("E2E Attendance Session A").click()
    cy.findByRole("button", { name: "Present" }).should("have.length.at.least", 1)
  })

  it("can cycle through attendance statuses for an athlete", () => {
    cy.contains("button", /E2E Attendance/i).click()
    cy.contains("E2E Attendance Session A").click()
    cy.findByRole("button", { name: "Present" }).first().click()
    cy.findByRole("button", { name: "Absent" }).first().click()
    cy.findByRole("button", { name: "Excused" }).first().click()
  })

  it("can save attendance — session remains visible after save", () => {
    cy.contains("button", /E2E Attendance/i).click()
    cy.contains("E2E Attendance Session A").click()
    cy.findByRole("button", { name: "Present" }).first().click()
    cy.findByRole("button", { name: "Save Attendance" }).click()
    cy.contains("button", /E2E Attendance Session A/i).should("be.visible")
  })
})
