describe("Account Page", () => {
  beforeEach(() => {
    cy.loginAsAthlete();
  });

  it("can navigate to Account", () => {
    cy.visit("/dashboard");
    cy.findByRole("link", { name: /account/i }).click();
    cy.url().should("include", "/dashboard/account");
  });

  it("shows Profile Emoji section", () => {
    cy.visit("/dashboard/account");
    cy.contains("Profile Emoji").should("be.visible");
  });

  it("shows Training Slots for athlete", () => {
    cy.visit("/dashboard/account");
    cy.contains(/Training|Schedule/).should("be.visible");
  });

  it("shows Celebration toggle for athlete", () => {
    cy.visit("/dashboard/account");
    cy.contains("Celebration").scrollIntoView().should("be.visible");
  });

  context("Mobile viewport — Athlete", () => {
    beforeEach(() => {
      cy.loginAsAthlete();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("Account link is visible in header on mobile", () => {
      cy.findByRole("link", { name: /account/i }).should("be.visible");
    });

    it("navigates to account page via header link on mobile", () => {
      cy.findByRole("link", { name: /account/i }).click();
      cy.url().should("include", "/dashboard/account");
    });

    it("shows Account Settings sections on mobile", () => {
      cy.visit("/dashboard/account");
      cy.contains("Profile Emoji").should("be.visible");
      cy.contains(/Training|Schedule/).should("be.visible");
      cy.contains("Celebration").scrollIntoView().should("be.visible");
    });
  });

  context("Mobile viewport — Coach", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
    });

    it("can navigate to account via hamburger menu on mobile", () => {
      cy.findByRole("button", { name: "Open menu" }).click();
      cy.contains("Account").click();
      cy.url().should("include", "/dashboard/account");
    });

    it("shows Account Settings on mobile for coach", () => {
      cy.visit("/dashboard/account");
      cy.contains("Account Settings").should("be.visible");
    });
  });
});
