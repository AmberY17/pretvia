describe("Coach Invite Athlete", () => {
  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard/group");
  });

  it("shows the Invite Athlete button on the group management page", () => {
    cy.contains(/Invite|Add Athlete/i).should("be.visible");
  });

  it("can open the invite athlete modal", () => {
    cy.contains(/Invite/i).first().click();
    cy.contains("Invite athlete").should("be.visible");
    cy.findByLabelText(/Athlete.*email/i).should("be.visible");
  });

  it("shows parent email field in athlete invite form", () => {
    cy.contains(/Invite/i).first().click();
    cy.contains("Invite athlete").should("be.visible");
    cy.findByLabelText(/Parent\/guardian email/i).should("be.visible");
  });

  it("shows parent email field when under 13 toggle is on", () => {
    cy.contains(/Invite/i).first().click();
    cy.contains("Invite athlete").should("be.visible");
    cy.findByLabelText("Under 13?").click();
    cy.findByLabelText(/Parent.*email/i).should("be.visible");
    cy.findByLabelText(/Athlete.*email/i).should("not.exist");
  });

  it("shows validation error when submitting without email", () => {
    cy.contains(/Invite/i).first().click();
    cy.contains("Invite athlete").should("be.visible");
    cy.contains("button", "Send invite").click();
    cy.findByLabelText(/Athlete.*email/i).then(($el) => {
      expect(($el[0] as HTMLInputElement).validity.valid).to.be.false;
    });
  });

  it("can close the invite modal", () => {
    cy.contains(/Invite/i).first().click();
    cy.contains("Invite athlete").should("be.visible");
    cy.contains("button", "Cancel").click();
    cy.contains("Invite athlete").should("not.exist");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(375, 667);
      cy.visit("/dashboard/group");
    });

    it("shows Invite button on mobile", () => {
      cy.contains(/Invite|Add Athlete/i).should("be.visible");
    });

    it("can open invite modal and see form fields on mobile", () => {
      cy.contains(/Invite/i).first().click();
      cy.contains("Invite athlete").should("be.visible");
      cy.findByLabelText(/Athlete.*email/i).should("be.visible");
      cy.contains("button", "Send invite").should("be.visible");
    });

    it("can close the invite modal on mobile", () => {
      cy.contains(/Invite/i).first().click();
      cy.contains("Invite athlete").should("be.visible");
      cy.contains("button", "Cancel").click();
      cy.contains("Invite athlete").should("not.exist");
    });
  });
});
