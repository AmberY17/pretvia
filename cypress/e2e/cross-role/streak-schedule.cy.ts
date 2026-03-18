export {}

const MON = 1
const WED = 3

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

describe("Cross-Role: Streak under coach schedule changes", () => {
  let groupId: string

  before(() => {
    // cleanupTestData (global before) deletes "E2E Test Group" — re-seed to restore it
    cy.exec("pnpm seed:test", { timeout: 30000 })
    // Clear stale cy.session() cache so loginAsCoach gets a fresh JWT with the new groupId
    cy.then(() => Cypress.session.clearAllSavedSessions())
    cy.loginAsCoach()
    cy.request("/api/groups?mode=coach-groups").then((res) => {
      groupId = res.body.groups[0]?.id
      expect(groupId, "coach must have at least one group").to.be.a("string")
    })

    cy.loginAsAthlete()
    cy.request("/api/logs").then((res) => {
      ;(res.body.logs ?? [])
        .filter((l: { notes?: string }) => l.notes?.startsWith("E2E streak-coach"))
        .forEach((l: { id?: string; _id?: string }) => cy.deleteLog(l.id ?? l._id ?? ""))
    })
  })

  after(() => {
    cy.loginAsCoach()
    cy.request({
      method: "PUT",
      url: `/api/groups/${groupId}/training-schedule`,
      body: { trainingSchedule: [{ dayOfWeek: MON, time: "09:00" }] },
    })
  })

  describe("Coach changes slot time preserves streak", () => {
    let streakBefore: number
    const logIds: string[] = []

    before(() => {
      cy.loginAsCoach()
      cy.request({
        method: "PUT",
        url: `/api/groups/${groupId}/training-schedule`,
        body: { trainingSchedule: [{ dayOfWeek: MON, time: "10:00" }] },
      }).then((res) => expect(res.status).to.eq(200))

      // One private log — stays within daily private cap
      cy.loginAsAthlete()
      cy.createLog({
        notes: "E2E streak-coach T4 Mon",
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

    it("streak does not decrease after coach changes slot from 10:00 to 11:00", () => {
      cy.loginAsCoach()
      cy.request({
        method: "PUT",
        url: `/api/groups/${groupId}/training-schedule`,
        body: { trainingSchedule: [{ dayOfWeek: MON, time: "11:00" }] },
      }).then((res) => expect(res.status).to.eq(200))

      cy.loginAsAthlete()
      cy.request("/api/stats").then((res) => {
        expect(res.body.streak).to.be.gte(streakBefore)
      })
    })
  })

  describe("Coach removes a slot entirely preserves streak", () => {
    let streakBefore: number
    const logIds: string[] = []

    before(() => {
      cy.loginAsCoach()
      cy.request({
        method: "PUT",
        url: `/api/groups/${groupId}/training-schedule`,
        body: {
          trainingSchedule: [
            { dayOfWeek: MON, time: "10:00" },
            { dayOfWeek: WED, time: "10:00" },
          ],
        },
      }).then((res) => expect(res.status).to.eq(200))

      // Test 4's log was deleted in its after() — private cap is reset
      cy.loginAsAthlete()
      cy.createLog({
        notes: "E2E streak-coach T5 Mon",
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

    it("streak does not decrease after coach removes Wednesday slot", () => {
      cy.loginAsCoach()
      cy.request({
        method: "PUT",
        url: `/api/groups/${groupId}/training-schedule`,
        body: { trainingSchedule: [{ dayOfWeek: MON, time: "10:00" }] },
      }).then((res) => expect(res.status).to.eq(200))

      cy.loginAsAthlete()
      cy.request("/api/stats").then((res) => {
        expect(res.body.streak).to.be.gte(streakBefore)
      })
    })
  })
})
