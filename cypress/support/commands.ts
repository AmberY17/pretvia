/// <reference types="cypress" />

const ATHLETE_EMAIL =
  Cypress.env("ATHLETE_EMAIL") ?? "athlete@test.pretvia.com";
const ATHLETE_PASSWORD =
  Cypress.env("ATHLETE_PASSWORD") ?? "TestPass123!";
const COACH_EMAIL =
  Cypress.env("COACH_EMAIL") ?? "coach@test.pretvia.com";
const COACH_PASSWORD =
  Cypress.env("COACH_PASSWORD") ?? "TestPass123!";

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

Cypress.Commands.add("logout", () => {
  cy.request("POST", "/api/auth/logout");
  cy.clearAllCookies();
});
