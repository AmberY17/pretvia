/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      loginAsAthlete(): Chainable<void>;
      loginAsCoach(): Chainable<void>;
      logout(): Chainable<void>;
    }
  }
}

export {};
