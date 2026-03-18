describe("Coach Dashboard", () => {
  describe("Profile / Groups", () => {
    beforeEach(() => {
      cy.loginAsCoach()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    after(() => {
      // Clean up any E2E test groups created
      cy.loginAsCoach()
      cy.request("/api/groups?mode=coach-groups").then((res) => {
        const groups = res.body.groups ?? []
        groups
          .filter((g: { name?: string }) => g.name === "E2E Test Group")
          .forEach((g: { id?: string; _id?: string }) => {
            const groupId = g.id ?? g._id
            cy.request({ method: "DELETE", url: `/api/groups/${groupId}`, failOnStatusCode: false })
          })
      })
    })

    it("can sign out — redirected to landing", () => {
      cy.findByRole("button", { name: "Sign Out" }).click()
      cy.url().should("eq", Cypress.config().baseUrl + "/")
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
          .filter((l: { notes?: string }) => l.notes?.includes("E2E coach-filter fixture"))
          .forEach((l: { id: string }) => {
            cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false })
          })
      })
      cy.createLog({
        emoji: "🎽",
        notes: "E2E coach-filter fixture",
        visibility: "coach",
        tags: ["e2e-coach-filter"],
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
      cy.loginAsCoach()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("all filter sections are visible and collapsible", () => {
      cy.contains("FILTER BY").should("be.visible")
      cy.contains("button", "Role").should("be.visible")
      cy.contains("button", "Athlete").should("be.visible")
      cy.contains("button", "Review Status").should("be.visible")
      cy.contains("button", "Date").should("be.visible")
      cy.contains("button", "Role").click()
      cy.contains("button", "All Roles").should("be.visible")
      cy.contains("button", "Role").click()
      cy.contains("button", "All Roles").should("not.be.visible")
    })

    it("can select a date from date picker — fixture log shown", () => {
      cy.contains("button", "Date").click()
      cy.contains("button", "Today").click()
      cy.get("main").contains("E2E coach-filter fixture").should("be.visible")
    })

    it("can pick a specific date — fixture log shown", () => {
      cy.contains("button", "Date").click()
      cy.findByRole("button", { name: /pick dates/i }).click()
      const today = new Date().getDate()
      cy.get('[role="gridcell"] button:not([disabled])')
        .contains(new RegExp(`^${today}$`))
        .first()
        .click()
      cy.get("main").contains("E2E coach-filter fixture").should("be.visible")
    })

    it("can clear all filters by clicking clear button", () => {
      cy.contains("button", "Date").click()
      cy.contains("button", "Today").click()
      cy.findByRole("button", { name: "Reset all filters" }).click()
      cy.findByRole("button", { name: "Reset all filters" }).should("not.exist")
    })

    it("Role section expands to show All Roles option", () => {
      cy.contains("button", "Role").click()
      cy.contains("button", "All Roles").should("be.visible")
    })

    it("Athlete section expands to show athlete options", () => {
      cy.contains("button", "Athlete").click()
      cy.contains("button", "All Athletes").should("be.visible")
    })

    it("Review Status section expands to show all options", () => {
      cy.contains("button", "Review Status").click()
      cy.contains("button", "All").should("be.visible")
      cy.contains("button", "Pending").should("be.visible")
      cy.contains("button", "Reviewed").should("be.visible")
      cy.contains("button", "Revisit").should("be.visible")
    })

    it("clicking Pending shows fixture log (new logs default to pending)", () => {
      cy.contains("button", "Review Status").click()
      cy.contains("button", "Pending").click()
      cy.get("main").contains("E2E coach-filter fixture").should("be.visible")
    })
  })

  describe("Announcement", () => {
    before(() => {
      cy.loginAsCoach()
      cy.request("/api/announcements").then((res) => {
        const announcements = res.body.announcements ?? []
        announcements
          .filter(
            (a: { text?: string }) =>
              a.text?.includes("E2E announcement text") ||
              a.text?.includes("E2E announcement updated"),
          )
          .forEach((a: { id: string }) => {
            cy.request("DELETE", `/api/announcements?id=${a.id}`)
          })
      })
    })

    after(() => {
      cy.loginAsCoach()
      cy.request("/api/announcements").then((res) => {
        const announcements = res.body.announcements ?? []
        announcements
          .filter(
            (a: { text?: string }) =>
              a.text?.includes("E2E announcement text") ||
              a.text?.includes("E2E announcement updated"),
          )
          .forEach((a: { id: string }) => {
            cy.request("DELETE", `/api/announcements?id=${a.id}`)
          })
      })
    })

    beforeEach(() => {
      cy.loginAsCoach()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("shows New Announcement button", () => {
      cy.contains("button", "New Announcement").should("be.visible")
    })

    it("can create an announcement — appears in feed", () => {
      cy.contains("button", "New Announcement").click()
      cy.findByPlaceholderText(/announcement/).type("E2E announcement text")
      cy.findByRole("button", { name: "Post" }).click()
      // Wait for post mode to exit (textarea gone) then confirm announcement is rendered
      cy.findByPlaceholderText(/announcement/).should("not.exist")
      cy.get("main").contains("E2E announcement text").scrollIntoView().should("be.visible")
    })

    it("can edit an announcement — updated text shown in feed", () => {
      cy.contains("E2E announcement text")
        .parent()
        .within(() => {
          cy.findByRole("button", { name: "Edit announcement" }).click({ force: true })
        })
      cy.findByRole("textbox").first().clear().type("E2E announcement updated")
      cy.findByRole("button", { name: "Save" }).click()
      // Wait for edit mode to exit then confirm updated text is rendered
      cy.findByRole("button", { name: "Save" }).should("not.exist")
      cy.get("main").contains("E2E announcement updated").scrollIntoView().should("be.visible")
    })

    it("can delete an announcement — removed from feed", () => {
      cy.contains("E2E announcement updated")
        .parent()
        .within(() => {
          cy.findByRole("button", { name: "Remove announcement" }).click({ force: true })
        })
      cy.findByRole("button", { name: "Delete" }).click()
      cy.get("main").should("not.contain", "E2E announcement updated")
    })
  })

  describe("Check-in", () => {
    before(() => {
      cy.loginAsCoach()
      cy.request("/api/checkins?mode=all").then((res) => {
        const checkins = res.body.checkins ?? []
        checkins
          .filter((c: { title?: string }) => c.title?.includes("E2E Checkin Session"))
          .forEach((c: { id: string }) => {
            cy.request({
              method: "DELETE",
              url: `/api/checkins?id=${c.id}`,
              failOnStatusCode: false,
            })
          })
      })
    })

    after(() => {
      cy.loginAsCoach()
      cy.request("/api/checkins?mode=all").then((res) => {
        const checkins = res.body.checkins ?? []
        checkins
          .filter((c: { title?: string }) => c.title?.includes("E2E Checkin Session"))
          .forEach((c: { id: string }) => {
            cy.request({
              method: "DELETE",
              url: `/api/checkins?id=${c.id}`,
              failOnStatusCode: false,
            })
          })
      })
    })

    beforeEach(() => {
      cy.loginAsCoach()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("shows Create Session Check-In button on dashboard", () => {
      cy.contains("Create Session Check-In").should("be.visible")
    })

    it("can create a check-in — card appears in feed", () => {
      cy.contains("Create Session Check-In").click()
      cy.contains("New Session Check-In").should("be.visible")
      cy.findByLabelText(/Title/i).type("E2E Checkin Session")
      cy.findByRole("button", { name: "Create" }).click()
      cy.contains('[data-testid="checkin-card"]', "E2E Checkin Session")
        .scrollIntoView()
        .should("be.visible")
      cy.contains('[data-testid="checkin-card"]', "E2E Checkin Session").within(() => {
        cy.contains(/\d+\/\d+ checked in/).should("be.visible")
      })
    })

    it("can delete a check-in with confirmation — removed from feed", () => {
      cy.contains('[data-testid="checkin-card"]', "E2E Checkin Session")
        .trigger("mouseover")
        .within(() => {
          cy.get('[aria-label="Remove check-in"]').click({ force: true })
        })
      cy.contains("This session check-in will be removed.").should("be.visible")
      cy.findByRole("button", { name: "Delete" }).click()
      cy.contains("E2E Checkin Session").should("not.exist")
    })
  })

  describe("Log", () => {
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
          .filter((l: { notes?: string }) => l.notes?.includes("E2E coach-log fixture"))
          .forEach((l: { id: string }) => {
            cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false })
          })
      })
      cy.createLog({
        emoji: "💪",
        notes: "E2E coach-log fixture",
        visibility: "coach",
        timestamp: new Date().toISOString(),
        tags: [],
      }).then((log) => {
        logId = log?.id ?? log?._id
      })
    })

    after(() => {
      cy.loginAsAthlete()
      if (logId) cy.deleteLog(logId)
    })

    beforeEach(() => {
      cy.loginAsCoach()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("can click the log and see details in the right panel", () => {
      cy.contains("E2E coach-log fixture").click()
      cy.contains("Log Details").should("be.visible")
    })

    it("can change the review status via dropdown", () => {
      cy.contains('[role="button"]', "E2E coach-log fixture").within(() => {
        cy.contains(/Pending|Reviewed|Revisit/i)
          .scrollIntoView()
          .click({ force: true })
      })
      cy.findByRole("menuitem", { name: "Revisit" }).click()
      cy.contains('[role="button"]', "E2E coach-log fixture").within(() => {
        cy.contains("Revisit").should("exist")
      })
    })
  })

  describe("Log — Review Status", () => {
    let reviewLogId: string

    before(() => {
      cy.loginAsAthlete()
      cy.request("/api/logs/today").then((res) => {
        if (res.body.sharedLogId) cy.deleteLog(res.body.sharedLogId)
        if (res.body.privateLogId) cy.deleteLog(res.body.privateLogId)
      })
      cy.request("/api/logs").then((res) => {
        const logs = res.body.logs ?? []
        logs
          .filter((l: { notes?: string }) => l.notes?.includes("E2E coach-review-pending"))
          .forEach((l: { id: string }) => {
            cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false })
          })
      })
      cy.createLog({
        emoji: "🔍",
        notes: "E2E coach-review-pending",
        visibility: "coach",
        timestamp: new Date().toISOString(),
        tags: [],
      }).then((log) => {
        reviewLogId = log?.id ?? log?._id
      })
    })

    after(() => {
      cy.loginAsAthlete()
      if (reviewLogId) cy.deleteLog(reviewLogId)
    })

    beforeEach(() => {
      cy.loginAsCoach()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("review status changes to Reviewed when log is opened", () => {
      cy.contains('[role="button"]', "E2E coach-review-pending").within(() => {
        cy.contains(/Pending/i).should("exist")
      })
      cy.contains("E2E coach-review-pending").click()
      cy.contains("Log Details").should("be.visible")
      cy.contains('[role="button"]', "E2E coach-review-pending").within(() => {
        cy.contains(/Reviewed/i).should("exist")
      })
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
          .filter((l: { notes?: string }) => l.notes?.includes("E2E coach-comments log"))
          .forEach((l: { id: string }) => {
            cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false })
          })
      })
      cy.request({
        method: "POST",
        url: "/api/logs",
        body: {
          emoji: "🎯",
          timestamp: new Date().toISOString(),
          visibility: "coach",
          notes: "E2E coach-comments log",
          tags: [],
        },
      }).then((res) => {
        logId = res.body.log?.id ?? res.body.log?._id
        if (logId) {
          cy.request(`/api/comments?logId=${logId}`).then((r) => {
            const comments = r.body.comments ?? []
            comments
              .filter(
                (c: { text?: string }) =>
                  c.text?.includes("E2E coach comment") || c.text?.includes("E2E seeded comment"),
              )
              .forEach((c: { id: string }) => {
                cy.request({
                  method: "DELETE",
                  url: `/api/comments?id=${c.id}`,
                  failOnStatusCode: false,
                })
              })
            // Seed as athlete so coach sees an unread comment on load
            cy.request({
              method: "POST",
              url: "/api/comments",
              body: { logId, text: "E2E seeded comment" },
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
      cy.loginAsCoach()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("can create a comment — comment appears with Coach badge", () => {
      cy.contains('[role="button"]', "E2E coach-comments log").within(() => {
        // Seeded athlete comment should show as unread to the coach
        cy.contains("button", /1 new comment/i)
          .should("be.visible")
          .click()
        cy.findByRole("textbox").type("E2E coach comment")
        cy.get('[aria-label="Send comment"]').click()
        // Wait for send to complete — input clears
        cy.findByRole("textbox").should("have.value", "")
        cy.contains('[data-testid="comment-item"]', "E2E coach comment")
          .scrollIntoView()
          .should("be.visible")
        cy.contains("Coach").should("be.visible")
      })
    })

    it("can see the updated number of comments", () => {
      cy.contains('[role="button"]', "E2E coach-comments log").within(() => {
        // 1 seeded athlete comment + 1 coach comment from previous test = 2
        cy.contains("button", /2 comments/i).should("be.visible")
      })
    })

    it("can edit a comment — updated text shown", () => {
      cy.contains('[role="button"]', "E2E coach-comments log").within(() => {
        cy.contains("button", /feedback|comment/i).click()
        cy.contains('[data-testid="comment-item"]', "E2E coach comment")
          .trigger("mouseover")
          .find('[aria-label="Edit comment"]')
          .click({ force: true })
        cy.get('[data-testid="comment-item"]')
          .find("textarea")
          .should("be.visible")
          .type("{selectall}E2E coach comment edited")
        cy.get('[data-testid="comment-item"]')
          .find('[aria-label="Save edit"]')
          .should("not.be.disabled")
          .click()
        cy.get('[data-testid="comment-item"]').find("textarea").should("not.exist")
        cy.contains('[data-testid="comment-item"]', "E2E coach comment edited")
          .scrollIntoView()
          .should("be.visible")
      })
    })

    it("can delete a comment — comment removed", () => {
      cy.contains('[role="button"]', "E2E coach-comments log").within(() => {
        cy.contains("button", /feedback|comment/i).click()
        cy.contains('[data-testid="comment-item"]', "E2E coach comment edited")
          .trigger("mouseover")
          .find('[aria-label="Delete comment"]')
          .click({ force: true })
        cy.contains("E2E coach comment edited").should("not.exist")
      })
    })
  })

  describe("Filters", () => {
    let logId: string

    before(() => {
      // cleanupTestData (global before) deletes "E2E Test Group", wiping the role and
      // athlete-role assignment the filter test depends on. Re-seed to restore them.
      cy.exec("pnpm seed:test", { timeout: 30000 })
      cy.loginAsAthlete()
      cy.request("/api/logs/today").then((res) => {
        if (res.body.sharedLogId) cy.deleteLog(res.body.sharedLogId)
        if (res.body.privateLogId) cy.deleteLog(res.body.privateLogId)
      })
      cy.request("/api/logs").then((res) => {
        const logs: { id: string; notes?: string }[] = res.body.logs ?? []
        logs
          .filter((l) => l.notes?.includes("E2E coach-filters-section fixture"))
          .forEach((l) =>
            cy.request({ method: "DELETE", url: `/api/logs?id=${l.id}`, failOnStatusCode: false }),
          )
      })
      cy.createLog({
        emoji: "🎽",
        notes: "E2E coach-filters-section fixture",
        visibility: "coach",
        tags: ["e2e-coach-filters-section"],
        timestamp: new Date().toISOString(),
      }).then((log) => {
        logId = log?.id ?? log?._id
      })
    })

    after(() => {
      cy.loginAsAthlete()
      if (logId) cy.deleteLog(logId)
    })

    beforeEach(() => {
      cy.loginAsCoach()
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("can filter by role — athlete logs shown", () => {
      cy.contains("button", "Role").click()
      cy.contains("button", "E2E Athlete Role").click()
      cy.get("main").contains("E2E coach-filters-section fixture").should("be.visible")
    })

    it("can filter by review status", () => {
      cy.contains("button", "Review Status").click()
      cy.contains("button", "Pending").click()
      cy.get("main").contains("E2E coach-filters-section fixture").should("be.visible")
    })

    it("can filter by athlete — that athlete's logs shown", () => {
      cy.contains("button", "Athlete").click()
      cy.contains("button", "E2E Athlete").click()
      cy.get("main").contains("E2E coach-filters-section fixture").should("be.visible")
    })

    it("can filter by date", () => {
      cy.contains("button", "Date").click()
      cy.contains("button", "Today").click()
      cy.get("main").contains("E2E coach-filters-section fixture").should("be.visible")
    })

    it("can apply multiple filters at once — still shows correct result", () => {
      cy.contains("button", "Review Status").click()
      cy.contains("button", "Pending").click()
      cy.contains("button", "Date").click()
      cy.contains("button", "Today").click()
      cy.get("main").contains("E2E coach-filters-section fixture").should("be.visible")
    })
  })
})
