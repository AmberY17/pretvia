/**
 * Coach Account Settings Tests
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

describe("Coach Account Settings", () => {
  beforeEach(() => {
    cy.loginAsCoach()
    cy.visit("/dashboard/account")
  })

  it.skip("can select the profile emoji — confirmed on dashboard", () => {
    cy.findByRole("button", { name: /Select emoji|emoji/i }).click()
    cy.get('[role="option"]').first().click({ force: true })
    cy.findByRole("button", { name: /Select emoji|emoji/i })
      .invoke("text")
      .should("not.eq", "?")
    cy.visit("/dashboard")
    cy.get("nav, aside").should("exist")
  })

  describe("Filter Order", () => {
    it("shows Filter Order section with all 5 labels", () => {
      cy.contains("h2", "Filter Order").scrollIntoView().should("be.visible")
      cy.contains(/Training Sessions/i).should("be.visible")
      cy.contains(/Role/i).should("be.visible")
      cy.contains(/Review Status/i).should("be.visible")
      cy.contains(/Athlete/i).should("be.visible")
      cy.contains(/Date/i).should("be.visible")
    })

    // TODO: we have to revisit dashboard and check the order of the filters on the sidebar
    it("can reorder filter sections via keyboard drag — order persists on reload", () => {
      cy.contains("h2", "Filter Order").scrollIntoView()
      cy.get('[aria-label^="Drag to reorder"]').then(($handles) => {
        const initialOrder = $handles.toArray().map((el) => el.getAttribute("aria-label"))
        cy.get('[aria-label^="Drag to reorder"]').first().focus()
        cy.focused().type(" ")
        cy.focused().type("{downarrow}")
        cy.focused().type(" ")
        cy.get('[aria-label^="Drag to reorder"]').then(($newHandles) => {
          const newOrder = $newHandles.toArray().map((el) => el.getAttribute("aria-label"))
          expect(newOrder).to.not.deep.equal(initialOrder)
        })
        cy.reload()
        cy.contains("h2", "Filter Order").scrollIntoView()
        cy.get('[aria-label^="Drag to reorder"]').then(($reloadedHandles) => {
          const reloadedOrder = $reloadedHandles
            .toArray()
            .map((el) => el.getAttribute("aria-label"))
          expect(reloadedOrder).to.not.deep.equal(initialOrder)
        })
      })
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
