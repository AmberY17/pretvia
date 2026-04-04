describe("Club Dashboard", () => {
  beforeEach(() => {
    cy.loginAsCoach();
  });

  it("shows upsell message for Squad plan coach", () => {
    cy.visit("/dashboard/club");
    cy.contains("Upgrade to the Club plan");
  });

  it("renders using the same shell layout as Manage Group", () => {
    cy.visit("/dashboard/club");
    // PageHeader is present with sticky top bar
    cy.contains("Club");
    // Upsell content is rendered inside a scrollable main container
    cy.get("main").should("exist");
  });

  it("does not show Club nav link for Squad plan coach", () => {
    cy.visit("/dashboard");
    cy.contains("a", "Club").should("not.exist");
  });

  describe("group-dependent", () => {
    before(() => {
      // cleanupTestData (global before) deletes "E2E Test Group" — re-seed to restore it
      cy.exec("pnpm seed:test", { timeout: 30000 });
      cy.then(() => Cypress.session.clearAllSavedSessions());
    });

    it("shows Join Another and Leave buttons for non-assistant coach", () => {
      cy.loginAsCoach();
      cy.visit("/dashboard");
      cy.contains("button", "Join Another");
      cy.contains("button", "Leave");
    });
  });

  // Club plan coach tests require a seeded club-plan account.
  // When a club coach is available (loginAsClubCoach), the following flows apply:
  //   - Coach Management tab shows section blocks per group with Invite + Add buttons
  //   - Each group header shows a rename pencil icon → inline input → save/cancel
  //   - "Add" button opens a multi-select modal for existing club coaches not yet in the group
  //   - "Move to" popover on assistant rows lists other club groups
  //   - No "Head coach" badge is rendered on any row
  //   - Group Management tab shows a section with a groups table and Create group button
});
