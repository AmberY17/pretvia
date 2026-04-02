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
    before(() => {
      cy.loginAsAthlete()
      cy.request("/api/logs/today").then((res) => {
        if (res.body.sharedLogId) cy.deleteLog(res.body.sharedLogId)
        if (res.body.privateLogId) cy.deleteLog(res.body.privateLogId)
      })
    })

    beforeEach(() => {
      cy.loginAsAthlete()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("can see the total number of logs", () => {
      cy.contains(/\d+ logs?/).should("be.visible")
    })

    it("total log count increments after creating a new log", () => {
      cy.contains(/\d+ logs?/)
        .invoke("text")
        .then((before) => {
          const beforeCount = parseInt(before.match(/\d+/)![0])
          cy.createLog({
            emoji: "📊",
            notes: "E2E count-test",
            visibility: "private",
            timestamp: new Date().toISOString(),
            tags: [],
          }).then((log) => {
            const logId = log?.id ?? log?._id
            cy.reload()
            cy.contains(new RegExp(`${beforeCount + 1} logs?`)).should("be.visible")
            if (logId) cy.deleteLog(logId)
          })
        })
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
      cy.request("/api/logs/today").then((res) => {
        if (res.body.sharedLogId) cy.deleteLog(res.body.sharedLogId)
        if (res.body.privateLogId) cy.deleteLog(res.body.privateLogId)
      })
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

    it("can select a date — fixture log appears", () => {
      cy.contains("button", "Date").click()
      cy.contains("button", "Today").click()
      cy.get("main").contains("E2E filter fixture").should("be.visible")
    })

    it("can pick a specific date — fixture log appears", () => {
      cy.contains("button", "Date").click()
      cy.findByRole("button", { name: /pick dates/i }).click()
      const today = new Date().getDate()
      cy.get('[role="gridcell"] button:not([disabled])')
        .contains(new RegExp(`^${today}$`))
        .first()
        .click()
      cy.get("main").contains("E2E filter fixture").should("be.visible")
    })

    it("can clear all the filters", () => {
      cy.contains("button", "Tags").click()
      cy.contains("button", "e2e-filter-tag").click()
      cy.findByRole("button", { name: "Reset all filters" }).click()
      cy.findByRole("button", { name: "Reset all filters" }).should("not.exist")
    })
  })

  describe("New Log dialog", () => {
    before(() => {
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
      })
    })

    beforeEach(() => {
      cy.loginAsAthlete()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("can create a log — appears in feed", () => {
      cy.findByRole("button", { name: "New Log" }).click()
      cy.contains("New Log Entry").should("be.visible")

      // Pick an emoji — the picker is an em-emoji-picker web component (shadow DOM)
      cy.findByRole("button", { name: "Select emoji" }).click()
      cy.get("em-emoji-picker").shadow().find("button[aria-posinset]").first().click()

      // Type notes
      cy.get("textarea#notes").first().type("E2E new log test")

      // Submit (default visibility is "Shared")
      cy.contains("button", "Save Log Entry").click()

      // Assert the new log card appears in the feed
      cy.get("main", { timeout: 15000 }).contains("E2E new log test").should("be.visible")
    })
  })

  describe("Log", () => {
    let logId: string
    let privateLogId: string

    before(() => {
      cy.loginAsAthlete()
      cy.request("/api/logs/today").then((res) => {
        if (res.body.sharedLogId) cy.deleteLog(res.body.sharedLogId)
        if (res.body.privateLogId) cy.deleteLog(res.body.privateLogId)
      })
      cy.request("/api/logs").then((res) => {
        const logs = res.body.logs ?? []
        logs
          .filter(
            (l: { notes?: string }) =>
              l.notes?.includes("E2E athlete-dashboard") ||
              l.notes?.includes("E2E athlete-private"),
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
    })

    after(() => {
      cy.loginAsAthlete()
      if (logId) cy.deleteLog(logId)
      if (privateLogId) cy.deleteLog(privateLogId)
    })

    beforeEach(() => {
      cy.loginAsAthlete()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
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
      // logId was edited in the previous test; its notes are now "E2E athlete-dashboard updated"
      cy.contains("E2E athlete-dashboard updated").click()
      cy.contains("Log Details").should("be.visible")
      cy.contains("button", "Delete").click()
      cy.contains("This log entry will be permanently removed.").should("be.visible")
      cy.findByRole("button", { name: "Delete" }).click()
      cy.get("main").should("not.contain", "E2E athlete-dashboard updated")
      logId = ""
    })
  })

  describe("Comments", () => {
    let logId: string

    before(() => {
      cy.loginAsAthlete()
      cy.request("/api/logs/today").then((res) => {
        if (res.body.sharedLogId) cy.deleteLog(res.body.sharedLogId)
        if (res.body.privateLogId) cy.deleteLog(res.body.privateLogId)
      })
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
        cy.contains("button", /feedback|comment/i).should("be.visible")
      })
    })

    it("can create a comment — comment appears in feedback section", () => {
      cy.contains('[role="button"]', "E2E athlete-comments log").within(() => {
        cy.contains("button", /feedback|comment/i).click()
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

  describe("Filters", () => {
    let logId: string
    let untaggedLogId: string

    before(() => {
      cy.loginAsAthlete()
      cy.request("/api/logs/today").then((res) => {
        if (res.body.sharedLogId) cy.deleteLog(res.body.sharedLogId)
        if (res.body.privateLogId) cy.deleteLog(res.body.privateLogId)
      })
      cy.request("/api/logs").then((res) => {
        const logs = res.body.logs ?? []
        logs
          .filter(
            (l: { notes?: string }) =>
              l.notes?.includes("E2E filter-section fixture") ||
              l.notes?.includes("E2E filter-section untagged"),
          )
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
      cy.createLog({
        emoji: "📝",
        notes: "E2E filter-section untagged",
        visibility: "private",
        tags: [],
        timestamp: new Date().toISOString(),
      }).then((log) => {
        untaggedLogId = log?.id ?? log?._id
      })
    })

    after(() => {
      cy.loginAsAthlete()
      if (logId) cy.deleteLog(logId)
      if (untaggedLogId) cy.deleteLog(untaggedLogId)
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
      cy.get("main").should("not.contain", "E2E filter-section untagged")
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
