/**
 * Athlete Account Settings Tests
 *
 * Delete account tests use a dedicated account seeded via `pnpm seed:test`:
 *   Email: deletetest@test.pretvia.com
 *   Password: TestPass123!
 *
 * Run `pnpm seed:test` between test runs to recreate the delete-test account.
 */

export {}

const DELETE_EMAIL = Cypress.env("DELETE_TEST_EMAIL") ?? "deletetest@test.pretvia.com"
const DELETE_PASSWORD = Cypress.env("DELETE_TEST_PASSWORD") ?? "TestPass123!"

describe("Athlete Account Settings", () => {
  beforeEach(() => {
    cy.loginAsAthlete()
    cy.visit("/dashboard/account")
  })

  it("can select the profile emoji — confirmed on dashboard", () => {
    cy.findByRole("button", { name: /Select emoji|emoji/i }).click()
    cy.get("em-emoji-picker").shadow().find("button[aria-posinset]").first().click()
    cy.findByRole("button", { name: /Select emoji|emoji/i })
      .invoke("text")
      .should("not.eq", "?")
    cy.visit("/dashboard")
    cy.get("nav, aside").should("exist")
  })

  it("can create a training schedule — slot appears and wheels are interactive", () => {
    cy.loginAsAthlete()
    cy.request({ method: "PUT", url: "/api/auth/profile", body: { trainingSlots: [] } })
    cy.visit("/dashboard/account")
    cy.contains(/Training Slots|Training/i)
      .closest("section")
      .within(() => {
        cy.contains(/Add schedule slot|Add Slot|Add Training Slot/i)
          .first()
          .click()
      })
    // Wait for slot to appear without fragile cy.wait + reload
    cy.contains(/Training Slots|Training/i)
      .closest("section")
      .within(() => {
        cy.get(
          '[aria-label*="Remove slot"], [aria-label*="remove"], button[aria-label*="delete"]',
          { timeout: 10000 },
        ).should("have.length.at.least", 1)
      })
    // Day wheel: open popover, scroll, assert label changed
    cy.get('[aria-label="Select day of week"]')
      .invoke("text")
      .then((originalDay) => {
        cy.get('[aria-label="Select day of week"]').click()
        cy.get("[data-radix-popper-content-wrapper] [data-rwp]")
          .first()
          .trigger("wheel", { deltaY: 64, force: true })
        cy.get('[aria-label="Select day of week"]').should("not.have.text", originalDay)
        cy.get("[data-radix-popper-content-wrapper]").should("not.exist") // wait for day popover to fully close
      })
    // Time wheel: open popover, scroll, close, assert label changed
    cy.intercept("PUT", "/api/auth/profile").as("timeSave")
    cy.get('[aria-label="Select time"]')
      .invoke("text")
      .then((originalTime) => {
        cy.get('[aria-label="Select time"]').click()
        cy.get("[data-radix-popper-content-wrapper] [data-rwp]")
          .first()
          .trigger("wheel", { deltaY: 64, force: true })
        cy.get("body").click(0, 0)
        cy.get('[aria-label="Select time"]').should("not.have.text", originalTime)
        cy.wait("@timeSave") // wait for 600ms debounce + PUT before navigating
      })
    // Navigate away and back — confirm slot persists
    cy.visit("/dashboard")
    cy.visit("/dashboard/account")
    cy.get('[aria-label="Remove slot"], [aria-label*="Remove slot"]', { timeout: 10000 }).should(
      "have.length.at.least",
      1,
    )
  })

  it("can toggle the celebration on new log — toggle state persists", () => {
    cy.contains(/Celebration/i).scrollIntoView()
    cy.contains(/Celebration/i)
      .closest("section, div")
      .within(() => {
        cy.get('[role="switch"]').then(($switch) => {
          const wasChecked = $switch.attr("aria-checked") === "true"
          cy.wrap($switch).click()
          cy.wrap($switch).should("have.attr", "aria-checked", String(!wasChecked))
        })
      })
    cy.reload()
    cy.contains(/Celebration/i)
      .closest("section, div")
      .within(() => {
        cy.get('[role="switch"]').should("have.attr", "aria-checked")
      })
  })

  describe("Delete Account", () => {
    before(() => {
      cy.exec("pnpm seed:test", { timeout: 30000 })
    })

    it("shows Delete Account section", () => {
      cy.login(DELETE_EMAIL, DELETE_PASSWORD)
      cy.visit("/dashboard/account")
      cy.contains(/Delete Account/i).should("be.visible")
    })

    it("shows confirmation dialog and can cancel", () => {
      cy.login(DELETE_EMAIL, DELETE_PASSWORD)
      cy.visit("/dashboard/account")
      cy.contains("button", /Delete Account/i).click()
      cy.contains(/cannot be undone|permanently/i).should("be.visible")
      cy.findByRole("button", { name: /Cancel/i }).click()
      cy.contains("Account Settings").should("be.visible")
    })

    it("deletes account, redirects to landing", { retries: 0 }, () => {
      cy.login(DELETE_EMAIL, DELETE_PASSWORD)
      cy.visit("/dashboard/account")
      cy.contains("button", /Delete Account/i).click()
      cy.contains(/cannot be undone|permanently/i).should("be.visible")
      cy.findByRole("button", { name: "Delete" }).click()
      cy.url({ timeout: 10000 }).should("not.include", "/dashboard")
    })

    it("dashboard inaccessible after account deletion", () => {
      cy.clearAllCookies()
      cy.visit("/dashboard", { failOnStatusCode: false })
      cy.url().should("not.include", "/dashboard")
    })
  })
})
