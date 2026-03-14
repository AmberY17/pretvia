describe("Account Profile Settings", () => {
  beforeEach(() => {
    cy.loginAsAthlete();
    cy.visit("/dashboard/account");
  });

  it("shows Account Settings page", () => {
    cy.contains("Account Settings").should("be.visible");
  });

  it("shows profile emoji section", () => {
    cy.contains(/profile|emoji/i).should("be.visible");
    cy.findByRole("button", { name: /Select emoji|emoji/i }).should(
      "be.visible",
    );
  });

  it("shows training slots section for athlete", () => {
    cy.contains(/Training/i).should("be.visible");
  });

  it("can add a training slot", () => {
    cy.contains(/Training Slots|Training/i)
      .closest("section")
      .within(() => {
        cy.contains(/Add schedule slot|Add Slot|Add Training Slot/i)
          .first()
          .click();
        cy.get('[aria-label="Select day of week"]').last().scrollIntoView().should("be.visible");
      });
  });

  it("shows celebration section for athlete", () => {
    cy.contains(/Celebration/i).scrollIntoView().should("be.visible");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsAthlete();
      cy.viewport(375, 667);
      cy.visit("/dashboard/account");
    });

    it("shows Account Settings on small screen", () => {
      cy.contains("Account Settings").should("be.visible");
    });

    it("shows profile emoji button on mobile", () => {
      cy.findByRole("button", { name: /Select emoji|emoji/i }).should("be.visible");
    });

    it("shows training slots section on mobile", () => {
      cy.contains(/Training/i).should("be.visible");
    });

    it("shows celebration section on mobile", () => {
      cy.contains(/Celebration/i).scrollIntoView().should("be.visible");
    });

    it("can add a training slot on mobile", () => {
      cy.contains(/Training Slots|Training/i)
        .closest("section")
        .within(() => {
          cy.contains(/Add schedule slot|Add Slot|Add Training Slot/i)
            .first()
            .click();
          cy.get('[aria-label="Select day of week"]').last().scrollIntoView().should("be.visible");
        });
    });
  });
});
