describe("Athlete Dashboard", () => {
  describe("Profile", () => {
    beforeEach(() => {
      cy.loginAsAthlete()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("can sign out — redirected to landing", () => {
      cy.findByRole("button", { name: "Sign Out" }).click()
      cy.url().should("eq", Cypress.config().baseUrl + "/")
    })
  })

  describe("Counter / Streaks", () => {
    beforeEach(() => {
      cy.loginAsAthlete()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    // TODO: we have to create a log for the athlete and check if the total number of logs gets incremented
    it("can see the total number of logs", () => {
      cy.contains(/\d+ logs?/).should("be.visible")
    })

    it("can navigate to account when clicking Edit schedule", () => {
      cy.findByRole("link", { name: /edit schedule|set up schedule/i }).click()
      cy.url().should("include", "/dashboard/account")
      cy.contains("Account Settings").should("be.visible")
    })
  })

  describe("Filter By", () => {
    let logId: string

    before(() => {
      cy.loginAsAthlete()
      cy.request("/api/logs").then((res) => {
        const logs = res.body.logs ?? []
        logs
          .filter((l: { notes?: string }) => l.notes?.includes("E2E filter fixture"))
          .forEach((l: { id: string }) => {
            cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false })
          })
      })
      cy.createLog({
        emoji: "🏋️",
        notes: "E2E filter fixture",
        visibility: "coach",
        tags: ["e2e-filter-tag"],
        timestamp: new Date().toISOString(),
      }).then((log) => {
        logId = log?.id ?? log?._id
      })
    })

    after(() => {
      cy.loginAsAthlete()
      if (logId) {
        cy.deleteLog(logId)
      }
    })

    beforeEach(() => {
      cy.loginAsAthlete()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("all filter sections are visible and collapsible", () => {
      cy.contains("FILTER BY").should("be.visible")
      cy.contains("button", "Tags").should("be.visible")
      cy.contains("button", "Date").should("be.visible")
      cy.contains("button", "Tags").click()
      cy.contains("button", "e2e-filter-tag").should("be.visible")
      cy.contains("button", "Tags").click()
      cy.contains("button", "e2e-filter-tag").should("not.be.visible")
    })

    it("can see existing tags under the Tags filter section", () => {
      cy.contains("button", "Tags").click()
      cy.contains("button", "e2e-filter-tag").should("be.visible")
    })

    // TODO: we have to click the Pick Dates to open the date picker and then select a date
    it("can select a date — fixture log appears", () => {
      cy.contains("button", "Date").click()
      cy.contains("button", "Today").click()
      cy.get("main").contains("E2E filter fixture").should("be.visible")
    })

    it("can clear all the filters", () => {
      cy.contains("button", "Tags").click()
      cy.contains("button", "e2e-filter-tag").click()
      cy.findByRole("button", { name: "Reset all filters" }).click()
      cy.findByRole("button", { name: "Reset all filters" }).should("not.exist")
    })
  })

  describe("Log", () => {
    let logId: string
    let privateLogId: string
    let deleteLogId: string

    before(() => {
      cy.loginAsAthlete()
      cy.request("/api/logs").then((res) => {
        const logs = res.body.logs ?? []
        logs
          .filter(
            (l: { notes?: string }) =>
              l.notes?.includes("E2E athlete-dashboard") ||
              l.notes?.includes("E2E athlete-private") ||
              l.notes?.includes("E2E athlete-delete me"),
          )
          .forEach((l: { id: string }) => {
            cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false })
          })
      })
      cy.createLog({
        emoji: "💪",
        notes: "E2E athlete-dashboard log",
        visibility: "coach",
        timestamp: new Date().toISOString(),
        tags: [],
      }).then((log) => {
        logId = log?.id ?? log?._id
      })
      cy.createLog({
        emoji: "🔒",
        notes: "E2E athlete-private log",
        visibility: "private",
        timestamp: new Date().toISOString(),
        tags: [],
      }).then((log) => {
        privateLogId = log?.id ?? log?._id
      })
      cy.createLog({
        emoji: "🗑️",
        notes: "E2E athlete-delete me",
        visibility: "private",
        timestamp: new Date().toISOString(),
        tags: [],
      }).then((log) => {
        deleteLogId = log?.id ?? log?._id
      })
    })

    after(() => {
      cy.loginAsAthlete()
      if (logId) cy.deleteLog(logId)
      if (privateLogId) cy.deleteLog(privateLogId)
      if (deleteLogId) {
        cy.request({
          method: "DELETE",
          url: `/api/logs?id=${deleteLogId}`,
          failOnStatusCode: false,
        })
      }
    })

    beforeEach(() => {
      cy.loginAsAthlete()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("can create a log — appears in feed", () => {
      cy.findByRole("button", { name: "New Log" }).click()
      cy.contains("New Log Entry").should("be.visible")
      cy.findByRole("button", { name: "Select emoji" }).should("be.visible")
    })

    it("opens log panel when clicking a log card", () => {
      cy.get("main").should("contain", "E2E athlete-dashboard log")
      cy.contains("E2E athlete-dashboard log").click()
      cy.contains("Log Details").should("be.visible")
    })

    it("can see feedback section for a shared log", () => {
      cy.contains('[role="button"]', "E2E athlete-dashboard log").within(() => {
        cy.contains(/Feedback/i).should("be.visible")
      })
    })

    it("cannot see a feedback section for a private log", () => {
      cy.contains('[role="button"]', "E2E athlete-private log").within(() => {
        cy.contains(/Feedback/i).should("not.exist")
      })
    })

    it("can edit a log — updated notes shown in feed", () => {
      cy.contains("E2E athlete-dashboard log").click()
      cy.contains("Log Details").should("be.visible")
      cy.findByRole("button", { name: "Edit" }).click()
      cy.contains("Edit Log").should("be.visible")
      cy.get("textarea#notes")
        .first()
        .scrollIntoView()
        .clear()
        .type("E2E athlete-dashboard updated")
      cy.contains("button", "Update Log").click()
      cy.get("main", { timeout: 15000 }).should("contain", "E2E athlete-dashboard updated")
    })

    it("can delete a log with confirmation — removed from feed", () => {
      cy.contains("E2E athlete-delete me").click()
      cy.contains("Log Details").should("be.visible")
      cy.contains("button", "Delete").click()
      cy.contains("This log entry will be permanently removed.").should("be.visible")
      cy.findByRole("button", { name: "Delete" }).click()
      cy.get("main").should("not.contain", "E2E athlete-delete me")
      deleteLogId = ""
    })
  })

  describe("Comments", () => {
    let logId: string

    before(() => {
      cy.loginAsAthlete()
      cy.request("/api/logs").then((res) => {
        const logs = res.body.logs ?? []
        logs
          .filter((l: { notes?: string }) => l.notes?.includes("E2E athlete-comments"))
          .forEach((l: { id: string }) => {
            cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false })
          })
      })
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
        logId = res.body.log?.id ?? res.body.log?._id
        if (logId) {
          cy.request(`/api/comments?logId=${logId}`).then((r) => {
            const comments = r.body.comments ?? []
            comments
              .filter((c: { text?: string }) => c.text?.includes("E2E comment"))
              .forEach((c: { id: string }) => {
                cy.request({
                  method: "DELETE",
                  url: `/api/comments?id=${c.id}`,
                  failOnStatusCode: false,
                })
              })
            cy.request({
              method: "POST",
              url: "/api/comments",
              body: { logId, text: "E2E comment from athlete" },
            })
          })
        }
      })
    })

    after(() => {
      cy.loginAsAthlete()
      if (logId) {
        cy.request({ method: "DELETE", url: `/api/logs?id=${logId}`, failOnStatusCode: false })
      }
    })

    beforeEach(() => {
      cy.loginAsAthlete()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("shows Feedback toggle on coach-shared log card", () => {
      cy.get("main").should("contain", "E2E athlete-comments log")
      cy.contains('[role="button"]', "E2E athlete-comments log").within(() => {
        cy.contains("Feedback").should("be.visible")
      })
    })

    it("can create a comment — comment appears in feedback section", () => {
      cy.contains('[role="button"]', "E2E athlete-comments log").within(() => {
        cy.contains("Feedback").click()
        cy.findByRole("textbox").type("E2E comment from athlete")
        cy.get('[aria-label="Send comment"]').click()
        cy.contains("E2E comment from athlete").scrollIntoView().should("be.visible")
      })
    })

    it("can edit a comment — edited text shown", () => {
      cy.contains('[role="button"]', "E2E athlete-comments log").within(() => {
        cy.contains("button", /feedback|comment/i).click()
        cy.contains('[data-testid="comment-item"]', "E2E comment from athlete")
          .trigger("mouseover")
          .find('[aria-label="Edit comment"]')
          .click({ force: true })
        cy.get('[data-testid="comment-item"]')
          .find("textarea")
          .should("be.visible")
          .type("{selectall}E2E comment edited")
        cy.get('[data-testid="comment-item"]')
          .find('[aria-label="Save edit"]')
          .should("not.be.disabled")
          .click()
        // Confirm edit mode exited and comment persisted as display text (not textarea)
        cy.get('[data-testid="comment-item"]').find("textarea").should("not.exist")
        cy.contains('[data-testid="comment-item"]', "E2E comment edited")
          .scrollIntoView()
          .should("be.visible")
      })
    })

    it("can delete a comment — comment removed", () => {
      cy.contains('[role="button"]', "E2E athlete-comments log").within(() => {
        cy.contains("button", /feedback|comment/i).click()
        cy.contains('[data-testid="comment-item"]', "E2E comment edited")
          .trigger("mouseover")
          .within(() => {
            cy.get('[aria-label="Delete comment"]').click({ force: true })
          })
        cy.contains("E2E comment edited").should("not.exist")
      })
    })
  })

  // TODO: the goal of this test is to check if selecting the filter renders the correct logs (Checking if the button exist was already tested above in Filter By test)
  // Create different logs for each filter and check if the correct logs are rendered
  describe("Filters", () => {
    let logId: string

    before(() => {
      cy.loginAsAthlete()
      cy.request("/api/logs").then((res) => {
        const logs = res.body.logs ?? []
        logs
          .filter((l: { notes?: string }) => l.notes?.includes("E2E filter-section fixture"))
          .forEach((l: { id: string }) => {
            cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false })
          })
      })
      cy.createLog({
        emoji: "🏋️",
        notes: "E2E filter-section fixture",
        visibility: "coach",
        tags: ["e2e-filter-section-tag"],
        timestamp: new Date().toISOString(),
      }).then((log) => {
        logId = log?.id ?? log?._id
      })
    })

    after(() => {
      cy.loginAsAthlete()
      if (logId) {
        cy.deleteLog(logId)
      }
    })

    beforeEach(() => {
      cy.loginAsAthlete()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("can filter by tags — only tagged logs shown", () => {
      cy.contains("button", "Tags").click()
      cy.contains("button", "e2e-filter-section-tag").click()
      cy.get("main").contains("E2E filter-section fixture").should("be.visible")
    })

    it("can filter by date — only today's logs shown", () => {
      cy.contains("button", "Date").click()
      cy.contains("button", "Today").click()
      cy.get("main").contains("E2E filter-section fixture").should("be.visible")
    })

    it("can filter by both tag and date together", () => {
      cy.contains("button", "Tags").click()
      cy.contains("button", "e2e-filter-section-tag").click()
      cy.contains("button", "Date").click()
      cy.contains("button", "Today").click()
      cy.get("main").contains("E2E filter-section fixture").should("be.visible")
    })
  })
})
