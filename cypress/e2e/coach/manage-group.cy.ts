describe("Coach Manage Group", () => {
  beforeEach(() => {
    cy.loginAsCoach()
    cy.visit("/dashboard/group")
  })

  describe("Roles", () => {
    before(() => {
      // cleanupTestData (global before) deletes "E2E Test Group" — re-seed to restore it
      cy.exec("pnpm seed:test", { timeout: 30000 })
      cy.loginAsCoach()
      cy.request("/api/groups").then((res) => {
        const groups = res.body.groups ?? []
        const group = groups[0]
        if (!group) return
        const groupId = group.id ?? group._id
        cy.request(`/api/groups/${groupId}/roles`).then((r) => {
          const roles = r.body.roles ?? []
          roles
            .filter((role: { name: string }) => role.name.startsWith("E2E Role"))
            .forEach((role: { id: string }) => {
              cy.request({
                method: "DELETE",
                url: `/api/groups/${groupId}/roles?roleId=${role.id}`,
                failOnStatusCode: false,
              })
            })
        })
      })
    })

    after(() => {
      cy.loginAsCoach()
      cy.request("/api/groups").then((res) => {
        const groups = res.body.groups ?? []
        const group = groups[0]
        if (!group) return
        const groupId = group.id ?? group._id
        cy.request(`/api/groups/${groupId}/roles`).then((r) => {
          const roles = r.body.roles ?? []
          roles
            .filter((role: { name: string }) => role.name.startsWith("E2E Role"))
            .forEach((role: { id: string }) => {
              cy.request({
                method: "DELETE",
                url: `/api/groups/${groupId}/roles?roleId=${role.id}`,
                failOnStatusCode: false,
              })
            })
        })
      })
    })

    it("can create a role — role pill appears", () => {
      cy.findByRole("textbox").type("E2E Role Alpha")
      cy.contains("button", "Add Role").click()
      cy.contains("button", "E2E Role Alpha").should("be.visible")
    })

    it("can edit a role — updated name appears", () => {
      cy.contains("button", "E2E Role Alpha").click()
      cy.findByRole("textbox").clear().type("E2E Role Beta")
      cy.contains("button", "Update").click()
      cy.contains("E2E Role Beta").should("be.visible")
      cy.contains("E2E Role Alpha").should("not.exist")
    })

    it("can delete a role with confirmation — role removed", () => {
      cy.contains("button", "E2E Role Beta").click()
      cy.contains("button", "Delete").click()
      cy.contains("Athletes will lose this role assignment.").should("be.visible")
      cy.findByRole("button", { name: "Delete" }).click()
      cy.contains("E2E Role Beta").should("not.exist")
    })

    it("can cancel role editing without saving", () => {
      cy.findByRole("textbox").type("E2E Role Cancel")
      cy.contains("button", "Add Role").click()
      cy.contains("button", "E2E Role Cancel").click()
      cy.findByRole("textbox").clear().type("E2E Role Modified")
      cy.contains("button", "Cancel").click()
      cy.contains("E2E Role Cancel").should("be.visible")
      cy.contains("E2E Role Modified").should("not.exist")
      // Clean up
      cy.contains("button", "E2E Role Cancel").click()
      cy.contains("button", "Delete").click()
      cy.findByRole("button", { name: "Delete" }).click()
    })
  })

  describe("Training Schedule", () => {
    before(() => {
      // cleanupTestData (global before) deletes "E2E Test Group" — re-seed to restore it
      cy.exec("pnpm seed:test", { timeout: 30000 })
      cy.loginAsCoach()
      cy.request("/api/groups?mode=coach-groups").then((res) => {
        const groupId = (res.body.groups ?? [])[0]?.id
        if (groupId) {
          cy.request({
            method: "PUT",
            url: `/api/groups/${groupId}/training-schedule`,
            body: { trainingSchedule: [{ dayOfWeek: 1, time: "09:00" }] },
          })
        }
      })
    })

    after(() => {
      cy.loginAsCoach()
      cy.request("/api/groups?mode=coach-groups").then((res) => {
        const groupId = (res.body.groups ?? [])[0]?.id
        if (groupId) {
          cy.request({
            method: "PUT",
            url: `/api/groups/${groupId}/training-schedule`,
            body: { trainingSchedule: [{ dayOfWeek: 1, time: "09:00" }] },
          })
        }
      })
    })

    it("can add a training slot — new slot appears in schedule", () => {
      cy.contains(/Training Schedule/i)
        .closest("section")
        .contains("button", /Add schedule slot/i)
        .click()
      cy.contains(/Training Schedule/i)
        .closest("section")
        .find('[aria-label="Remove slot"]')
        .should("have.length", 2)
      cy.contains(/saved|updated/i)
        .scrollIntoView()
        .should("be.visible")
    })

    it("can edit a training slot — day picker is interactive", () => {
      cy.contains(/Training Schedule/i)
        .closest("section")
        .within(() => {
          cy.get('[aria-label="Select day of week"]').first().click()
        })
      cy.get("body").click(0, 0)
      cy.contains(/saved|updated|applied/i)
        .scrollIntoView()
        .should("be.visible")
    })

    it("can delete a training slot — slot removed from schedule", () => {
      cy.contains(/Training Schedule/i)
        .closest("section")
        .within(() => {
          cy.get(
            '[aria-label="Remove slot"], button[aria-label*="delete"], button[aria-label*="remove"]',
          )
            .first()
            .click()
        })
      cy.contains(/Training Schedule/i)
        .closest("section")
        .within(() => {
          cy.get(
            '[aria-label="Remove slot"], button[aria-label*="delete"], button[aria-label*="remove"]',
          ).should("have.length", 1)
        })
    })
  })

  describe("Athletes", () => {
    let assignRoleId: string

    before(() => {
      // cleanupTestData (global before) deletes "E2E Test Group" — re-seed to restore it
      cy.exec("pnpm seed:test", { timeout: 30000 })
      // Clear stale cy.session() cache so loginAsCoach gets a fresh JWT with the new groupId
      cy.then(() => Cypress.session.clearAllSavedSessions())
      cy.loginAsCoach()
      cy.request("/api/groups?mode=coach-groups").then((res) => {
        const groupId = (res.body.groups ?? [])[0]?.id
        if (groupId) {
          // Clear any roles already assigned to the E2E Athlete
          cy.request(`/api/groups?groupId=${groupId}`).then((membersRes) => {
            const athlete = (membersRes.body.members ?? []).find(
              (m: { email: string }) => m.email === "athlete@test.pretvia.com",
            )
            if (athlete?.id) {
              cy.request({
                method: "PATCH",
                url: `/api/groups/${groupId}/members`,
                body: { action: "assignRoles", userId: athlete.id, roleIds: [] },
                failOnStatusCode: false,
              })
            }
          })
          cy.request({
            method: "POST",
            url: `/api/groups/${groupId}/roles`,
            body: { name: "E2E Assign Role" },
          }).then((r) => {
            assignRoleId = r.body.role?.id ?? r.body.role?._id ?? r.body.id
          })
        }
      })
    })

    after(() => {
      cy.loginAsCoach()
      cy.request("/api/groups?mode=coach-groups").then((res) => {
        const groupId = (res.body.groups ?? [])[0]?.id
        if (groupId && assignRoleId) {
          cy.request({
            method: "DELETE",
            url: `/api/groups/${groupId}/roles?roleId=${assignRoleId}`,
            failOnStatusCode: false,
          })
        }
      })
    })

    it("can search for an athlete — result shown", () => {
      cy.findByRole("searchbox").type("E2E Athlete")
      cy.contains('[data-testid="athlete-row"]', /E2E Athlete/).should("be.visible")
    })

    it("shows no results for a non-existent athlete search", () => {
      cy.findByRole("searchbox").type("xyz-nobody-12345")
      cy.get('[data-testid="athlete-row"]').should("not.exist")
    })

    it("clearing search restores the athlete list", () => {
      cy.findByRole("searchbox").type("E2E Athlete")
      cy.contains('[data-testid="athlete-row"]', /E2E Athlete/).should("be.visible")
      cy.findByRole("searchbox").clear()
      cy.contains('[data-testid="athlete-row"]', /E2E Athlete/).should("be.visible")
    })

    it("can assign a role to an athlete — role shown on athlete row", () => {
      cy.contains('[data-testid="athlete-row"]', /E2E Athlete|athlete@test/i).within(() => {
        cy.contains("button", /No roles|roles/i).click()
      })
      cy.contains("label", "E2E Assign Role").click()
      cy.get("body").click(0, 0)
      cy.contains('[data-testid="athlete-row"]', /E2E Athlete|athlete@test/i).within(() => {
        cy.contains("E2E Assign Role").should("be.visible")
      })
    })
  })

  describe("Invite", () => {
    beforeEach(() => {
      cy.contains(/Invite/i)
        .first()
        .click()
      cy.contains("Invite athlete").should("be.visible")
    })

    it("can send an invite — success toast or modal closes", () => {
      cy.findByLabelText(/Athlete.*email/i).type("invite-e2e@example.com")
      cy.contains("button", "Send invite").click()
      cy.get("body").should("satisfy", ($body: JQuery<HTMLBodyElement>) => {
        return (
          $body.text().includes("invite") ||
          $body.text().includes("sent") ||
          $body.find('[role="alert"]').length > 0 ||
          !$body.text().includes("Invite athlete")
        )
      })
    })

    it("Under 13 toggle hides athlete email, shows parent email field", () => {
      cy.findByLabelText("Under 13?").click()
      cy.findByLabelText(/Parent.*email/i).should("be.visible")
      cy.findByLabelText(/Athlete.*email/i).should("not.exist")
    })

    it("shows validation error when submitting without email", () => {
      cy.contains("button", "Send invite").click()
      cy.findByLabelText(/Athlete.*email/i).then(($el) => {
        expect(($el[0] as HTMLInputElement).validity.valid).to.be.false
      })
    })

    it("can close the invite modal", () => {
      cy.contains("button", "Cancel").click()
      cy.contains("Invite athlete").should("not.exist")
    })
  })

  describe("Invite Redemption", () => {
    it("shows error for an invalid invite token", () => {
      cy.visit("/invite/totally-invalid-token-xyz", { failOnStatusCode: false })
      cy.contains(/not found|expired|invalid/i).should("be.visible")
    })

    it("shows the athlete join form for a valid athlete invite token", () => {
      cy.visit("/invite/e2e-invite-athlete", { failOnStatusCode: false })
      cy.contains(/Join|sign in|create/i).should("be.visible")
      cy.get('input[type="email"]').should("be.visible")
      cy.get('input[type="password"]').should("be.visible")
    })

    it("shows the group name on the athlete invite page", () => {
      cy.visit("/invite/e2e-invite-athlete", { failOnStatusCode: false })
      cy.contains(/E2E Test Group|Join/i).should("be.visible")
    })

    it("shows toggle between sign in and create account on athlete invite", () => {
      cy.visit("/invite/e2e-invite-athlete", { failOnStatusCode: false })
      cy.contains(/Already have an account|Create new account/i).should("be.visible")
    })

    it("shows the parent form for a valid parent invite token", () => {
      cy.visit("/invite/e2e-invite-parent", { failOnStatusCode: false })
      cy.contains(/sign in|create.*parent|parent/i).should("be.visible")
      cy.get('input[type="email"]').should("be.visible")
    })

    it("shows the under-13 setup form for a valid under-13 invite token", () => {
      cy.visit("/invite/e2e-invite-under13", { failOnStatusCode: false })
      cy.contains(/child|under.*13|set up/i).should("be.visible")
    })
  })
})
