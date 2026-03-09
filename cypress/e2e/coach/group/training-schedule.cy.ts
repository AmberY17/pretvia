describe("Group Training Schedule", () => {
  before(() => {
    cy.loginAsCoach();
    // The training schedule is part of the group document — no direct delete API
    // Tests will add/update slots and verify the UI response
  });

  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard/group");
  });

  it("shows Training Schedule section on the group management page", () => {
    cy.contains(/Training Schedule/i).should("be.visible");
  });

  it("shows Add Slot button in the training schedule section", () => {
    cy.contains(/Training Schedule/i)
      .closest("section")
      .within(() => {
        cy.contains(/Add Slot|Add/i).should("be.visible");
      });
  });

  it("can add a training slot", () => {
    cy.contains(/Training Schedule/i)
      .closest("section")
      .within(() => {
        cy.contains(/Add Slot|Add/i).click();
        cy.get('select, [role="listbox"]').should("have.length.at.least", 1);
      });
  });

  it("can save the training schedule", () => {
    cy.contains(/Training Schedule/i)
      .closest("section")
      .within(() => {
        cy.contains("button", /Save/i).click();
      });
    cy.contains(/saved|updated|applied/i).should("be.visible");
  });

  it("athlete can sync group schedule from account page", () => {
    cy.loginAsAthlete();
    cy.visit("/dashboard/account");
    cy.contains(/Sync Group Schedule/i).should("be.visible");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(375, 667);
      cy.visit("/dashboard/group");
    });

    it("shows Training Schedule section on mobile", () => {
      cy.contains(/Training Schedule/i).should("be.visible");
    });

    it("shows Add Slot button on mobile", () => {
      cy.contains(/Training Schedule/i)
        .closest("section")
        .within(() => {
          cy.contains(/Add Slot|Add/i).should("be.visible");
        });
    });

    it("can add a training slot on mobile", () => {
      cy.contains(/Training Schedule/i)
        .closest("section")
        .within(() => {
          cy.contains(/Add Slot|Add/i).click();
          cy.get('select, [role="listbox"]').should("have.length.at.least", 1);
        });
    });
  });
});
