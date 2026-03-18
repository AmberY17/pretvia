/**
 * Athlete: Streak behaviour under personal schedule changes
 *
 * Tests 1-3 cover schedule mutations via the athlete's own profile.
 * Each nested describe cleans up its own logs in an after() hook so the daily
 * cap is reset before the next describe's before() runs.
 */

export {}

const MON = 1
const WED = 3
const THU = 4

/** Returns an ISO timestamp for a past occurrence of dayOfWeek at hour:30 UTC. */
function pastSlotTimestamp(dayOfWeek: number, weeksAgo = 0, hour = 10): string {
  const d = new Date()
  const currentUTCDay = d.getUTCDay()
  let daysBack = (currentUTCDay - dayOfWeek + 7) % 7
  if (daysBack === 0) daysBack = 7
  d.setUTCDate(d.getUTCDate() - daysBack - weeksAgo * 7)
  d.setUTCHours(hour, 30, 0, 0)
  return d.toISOString()
}

describe("Athlete: Streak under personal schedule changes", () => {
  before(() => {
    cy.loginAsAthlete()
    cy.request("/api/logs").then((res) => {
      ;(res.body.logs ?? [])
        .filter((l: { notes?: string }) => l.notes?.startsWith("E2E streak-schedule"))
        .forEach((l: { id?: string; _id?: string }) => cy.deleteLog(l.id ?? l._id ?? ""))
    })
    cy.request({ method: "PUT", url: "/api/auth/profile", body: { trainingSlots: [] } })
  })

  after(() => {
    cy.loginAsAthlete()
    cy.request({ method: "PUT", url: "/api/auth/profile", body: { trainingSlots: [] } })
  })

  describe("Adding a slot does not break the streak", () => {
    let streakBefore: number
    const logIds: string[] = []

    before(() => {
      cy.loginAsAthlete()
      cy.request({
        method: "PUT",
        url: "/api/auth/profile",
        body: {
          trainingSlots: [
            { dayOfWeek: MON, time: "10:00" },
            { dayOfWeek: WED, time: "10:00" },
          ],
        },
      })
      // One private log — stays within the daily private cap
      cy.createLog({
        notes: "E2E streak-schedule T1 Mon",
        timestamp: pastSlotTimestamp(MON),
        visibility: "private",
      }).then((log) => logIds.push(log.id ?? log._id))
      cy.request("/api/stats").then((res) => {
        streakBefore = res.body.streak
        cy.log(`streakBefore = ${streakBefore}`)
      })
    })

    // Delete logs immediately so the next describe starts with a clean daily cap
    after(() => {
      cy.loginAsAthlete()
      logIds.forEach((id) => cy.deleteLog(id))
    })

    it("streak does not decrease after adding Thursday slot", () => {
      cy.request({
        method: "PUT",
        url: "/api/auth/profile",
        body: {
          trainingSlots: [
            { dayOfWeek: MON, time: "10:00" },
            { dayOfWeek: WED, time: "10:00" },
            { dayOfWeek: THU, time: "10:00" },
          ],
        },
      }).then((res) => expect(res.status).to.eq(200))

      cy.request("/api/stats").then((res) => {
        expect(res.body.streak).to.be.gte(streakBefore)
      })
    })
  })

  describe("Removing a slot preserves the streak", () => {
    let streakBefore: number
    const logIds: string[] = []

    before(() => {
      cy.loginAsAthlete()
      cy.request({
        method: "PUT",
        url: "/api/auth/profile",
        body: {
          trainingSlots: [
            { dayOfWeek: MON, time: "10:00" },
            { dayOfWeek: WED, time: "10:00" },
          ],
        },
      })
      // Test 1's log was deleted in its after() — cap is reset
      cy.createLog({
        notes: "E2E streak-schedule T2 Mon",
        timestamp: pastSlotTimestamp(MON),
        visibility: "private",
      }).then((log) => logIds.push(log.id ?? log._id))
      cy.request("/api/stats").then((res) => {
        streakBefore = res.body.streak
        cy.log(`streakBefore = ${streakBefore}`)
      })
    })

    after(() => {
      cy.loginAsAthlete()
      logIds.forEach((id) => cy.deleteLog(id))
    })

    it("streak does not decrease after removing Monday slot", () => {
      cy.request({
        method: "PUT",
        url: "/api/auth/profile",
        body: { trainingSlots: [{ dayOfWeek: WED, time: "10:00" }] },
      }).then((res) => expect(res.status).to.eq(200))

      cy.request("/api/stats").then((res) => {
        expect(res.body.streak).to.be.gte(streakBefore)
      })
    })

    it("streak number is visible on the dashboard (UI smoke check)", () => {
      cy.loginAsAthlete()
      cy.visit("/dashboard")
      cy.contains(/\d+ training day/).should("be.visible")
    })
  })

  describe("Re-adding a deleted slot keeps the streak", () => {
    let streakAfterDelete: number

    before(() => {
      cy.loginAsAthlete()
      cy.request("/api/stats").then((res) => {
        streakAfterDelete = res.body.streak
        cy.log(`streakAfterDelete = ${streakAfterDelete}`)
      })
    })

    it("streak does not drop after re-adding Monday slot", () => {
      cy.request({
        method: "PUT",
        url: "/api/auth/profile",
        body: {
          trainingSlots: [
            { dayOfWeek: MON, time: "10:00" },
            { dayOfWeek: WED, time: "10:00" },
          ],
        },
      }).then((res) => expect(res.status).to.eq(200))

      cy.request("/api/stats").then((res) => {
        expect(res.body.streak).to.be.gte(streakAfterDelete)
      })
    })
  })
})
