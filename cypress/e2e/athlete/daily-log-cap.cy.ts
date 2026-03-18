/**
 * Athlete: Daily log cap UI behaviour
 *
 * The app allows one shared ("Shared") and one private ("Only me") log per
 * calendar day. The log form reflects this by:
 *   - disabling the Shared button after the first shared log
 *   - disabling the Only me button after the first private log
 *   - replacing the whole form with an "already logged" state once both are used
 *
 * Tests use cy.request only for setup/teardown; all assertions are UI-based.
 */

export {}

describe("Athlete: Daily log cap", () => {
  before(() => {
    // Wipe any logs the test account already has today so we start clean
    cy.loginAsAthlete()
    cy.request("/api/logs/today").then((res) => {
      if (res.body.sharedLogId) cy.deleteLog(res.body.sharedLogId)
      if (res.body.privateLogId) cy.deleteLog(res.body.privateLogId)
    })
  })

  after(() => {
    cy.loginAsAthlete()
    cy.request("/api/logs/today").then((res) => {
      if (res.body.sharedLogId) cy.deleteLog(res.body.sharedLogId)
      if (res.body.privateLogId) cy.deleteLog(res.body.privateLogId)
    })
  })

  beforeEach(() => {
    cy.loginAsAthlete()
    cy.visit("/dashboard")
  })

  it("both Shared and Only me options are enabled before any log today", () => {
    cy.findByRole("button", { name: "New Log" }).click()
    cy.contains("New Log Entry").should("be.visible")
    cy.contains("button", "Shared").should("not.be.disabled")
    cy.contains("button", "Only me").should("not.be.disabled")
  })

  it("after the shared log is created, the Shared button is disabled and shows a hint", () => {
    // Set up: create today's shared log via API
    cy.createLog({ notes: "E2E daily-cap shared", visibility: "coach" })

    cy.visit("/dashboard")
    cy.findByRole("button", { name: "New Log" }).click()
    cy.contains("button", "Shared").should("be.disabled")
    cy.contains("button", "Only me").should("not.be.disabled")
    cy.contains("Shared already logged.").should("be.visible")
  })

  it("after both logs are created, the form shows an already-logged state with edit options", () => {
    // Set up: create today's private log via API (shared was created in previous test)
    cy.createLog({ notes: "E2E daily-cap private", visibility: "private" })

    cy.visit("/dashboard")
    cy.findByRole("button", { name: "New Log" }).click()
    cy.contains("You've already logged today.").should("be.visible")
    cy.contains("button", "Edit Shared Log").should("be.visible")
    cy.contains("button", "Edit Private Log").should("be.visible")
  })
})
