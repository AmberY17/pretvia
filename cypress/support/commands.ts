/// <reference types="cypress" />

const ATHLETE_EMAIL =
  Cypress.env("ATHLETE_EMAIL") ?? "athlete@test.pretvia.com";
const ATHLETE_PASSWORD =
  Cypress.env("ATHLETE_PASSWORD") ?? "TestPass123!";
const COACH_EMAIL =
  Cypress.env("COACH_EMAIL") ?? "coach@test.pretvia.com";
const COACH_PASSWORD =
  Cypress.env("COACH_PASSWORD") ?? "TestPass123!";
const GUARDIAN_EMAIL = Cypress.env("GUARDIAN_EMAIL") ?? "";
const GUARDIAN_PASSWORD = Cypress.env("GUARDIAN_PASSWORD") ?? "";

Cypress.Commands.add("login", (email: string, password: string) => {
  cy.session(
    [email, password],
    () => {
      cy.request("POST", "/api/auth/login", { email, password }).then(
        (res) => {
          expect(res.status).to.eq(200);
        }
      );
    },
    {
      validate() {
        cy.request("/api/auth/session").its("body.user").should("exist");
      },
    }
  );
});

Cypress.Commands.add("loginAsAthlete", () => {
  cy.login(ATHLETE_EMAIL, ATHLETE_PASSWORD);
});

Cypress.Commands.add("loginAsCoach", () => {
  cy.login(COACH_EMAIL, COACH_PASSWORD);
});

Cypress.Commands.add("loginAsGuardian", function () {
  if (!GUARDIAN_EMAIL || !GUARDIAN_PASSWORD) {
    cy.log("Guardian credentials not set — skipping test");
    this.skip();
    return;
  }
  cy.login(GUARDIAN_EMAIL, GUARDIAN_PASSWORD);
});

Cypress.Commands.add("logout", () => {
  cy.request("POST", "/api/auth/logout");
  cy.clearAllCookies();
});

Cypress.Commands.add(
  "createLog",
  (
    attrs: Partial<{
      emoji: string;
      timestamp: string;
      visibility: "coach" | "private";
      notes: string;
      tags: string[];
    }> = {},
  ) => {
    return cy
      .request({
        method: "POST",
        url: "/api/logs",
        body: {
          emoji: "💪",
          timestamp: new Date().toISOString(),
          visibility: "coach",
          notes: "E2E auto-created log",
          tags: [],
          ...attrs,
        },
      })
      .then((res) => res.body.log);
  },
);

Cypress.Commands.add("deleteLog", (logId: string) => {
  cy.request({
    method: "DELETE",
    url: `/api/logs?id=${logId}`,
    failOnStatusCode: false,
  });
});

Cypress.Commands.add(
  "createCheckin",
  (
    attrs: Partial<{ sessionDate: string; title: string }> = {},
  ) => {
    return cy
      .request({
        method: "POST",
        url: "/api/checkins",
        body: {
          sessionDate: new Date().toISOString(),
          title: "E2E auto-created session",
          ...attrs,
        },
      })
      .then((res) => res.body.checkin);
  },
);

Cypress.Commands.add("deleteCheckin", (checkinId: string) => {
  cy.request({
    method: "DELETE",
    url: `/api/checkins?id=${checkinId}`,
    failOnStatusCode: false,
  });
});
