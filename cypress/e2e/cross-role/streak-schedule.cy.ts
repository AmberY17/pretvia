/**
 * Cross-Role: Streak behaviour under coach-driven schedule changes
 *
 * Tests 4-5 cover schedule mutations the coach applies to the whole group.
 * Each nested describe cleans up its own logs in an after() hook so the
 * daily log cap is reset before the next describe's before() runs.
 */

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
    cy.loginAsCoach()
    cy.request("/api/groups?mode=coach-groups").then((res) => {
      groupId = res.body.groups[0]?.id
      expect(groupId, "coach must have at least one group").to.be.a("string")
    })

    cy.loginAsAthlete()
    cy.request("/api/logs").then((res) => {
      ;(res.body.logs ?? [])
        .filter((l: { notes?: string }) => l.notes?.startsWith("E2E streak-coach"))
        .forEach((l: { id?: string; _id?: string }) =>
          cy.deleteLog(l.id ?? l._id ?? "")
        )
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 4 — Coach changes slot time: old logs still count toward streak
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Test 4 — Coach changes slot time preserves streak", () => {
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 5 — Coach removes slot entirely: past logs still count toward streak
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Test 5 — Coach removes a slot entirely preserves streak", () => {
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
