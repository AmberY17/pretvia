describe("Cross-Role: Comment Exchange", () => {
  let logId: string

  before(() => {
    cy.loginAsAthlete()
    cy.request("/api/logs").then((res) => {
      ;(res.body.logs ?? [])
        .filter((l: { notes?: string; id?: string; _id?: string }) =>
          l.notes?.includes("E2E comment exchange"),
        )
        .forEach((l: { id?: string; _id?: string }) => cy.deleteLog(l.id ?? l._id ?? ""))
    })
    cy.createLog({
      emoji: "🎯",
      notes: "E2E comment exchange",
      visibility: "coach",
      tags: [],
    }).then((log) => {
      logId = log?.id ?? log?._id
      if (logId) {
        cy.request(`/api/comments?logId=${logId}`).then((r) => {
          ;(r.body.comments ?? [])
            .filter((c: { text?: string; id?: string }) => c.text?.includes("E2E cross"))
            .forEach((c: { id?: string }) =>
              cy.request({
                method: "DELETE",
                url: `/api/comments?id=${c.id}`,
                failOnStatusCode: false,
              }),
            )
        })
      }
    })
  })

  after(() => {
    cy.loginAsAthlete()
    if (logId) cy.deleteLog(logId)
  })

  it("coach posts feedback → athlete sees it with Coach badge", () => {
    cy.loginAsCoach()
    cy.request({
      method: "POST",
      url: "/api/comments",
      body: { logId, text: "E2E cross-role coach feedback" },
    }).then((res) => expect(res.status).to.eq(200))

    cy.loginAsAthlete()
    cy.visit("/dashboard")
    cy.contains('[role="button"]', "E2E comment exchange").within(() => {
      cy.contains("button", /feedback|comment/i).click()
      cy.contains("E2E cross-role coach feedback").should("be.visible")
      cy.contains("Coach").should("be.visible")
    })
  })

  it("athlete replies via UI → coach sees the reply", () => {
    cy.loginAsAthlete()
    cy.visit("/dashboard")
    cy.contains('[role="button"]', "E2E comment exchange").within(() => {
      cy.contains("button", /feedback|comment/i).click()
      cy.findByRole("textbox").type("E2E cross-role athlete reply")
      cy.get('[aria-label="Send comment"]').click()
      cy.findByRole("textbox").should("have.value", "")
      cy.contains("E2E cross-role athlete reply").should("be.visible")
    })

    cy.loginAsCoach()
    cy.visit("/dashboard")
    cy.contains('[role="button"]', "E2E comment exchange", { timeout: 15000 })
      .scrollIntoView()
      .within(() => {
        cy.contains("button", /feedback|comment/i).click()
        cy.contains("E2E cross-role athlete reply", { timeout: 15000 }).should("be.visible")
      })
  })
})
