/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      loginAsAthlete(): Chainable<void>;
      loginAsCoach(): Chainable<void>;
      loginAsGuardian(): Chainable<void>;
      logout(): Chainable<void>;
      createLog(attrs?: Partial<{
        emoji: string;
        timestamp: string;
        visibility: "coach" | "private";
        notes: string;
        tags: string[];
      }>): Chainable<{ id: string; _id?: string }>;
      deleteLog(logId: string): Chainable<void>;
      createCheckin(attrs?: Partial<{
        sessionDate: string;
        title: string;
      }>): Chainable<{ id: string; _id?: string }>;
      deleteCheckin(checkinId: string): Chainable<void>;
    }
  }
}

export {};
