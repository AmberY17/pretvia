describe("Account Page", () => {
  beforeEach(() => {
    cy.loginAsAthlete();
  });

  it("can navigate to Account", () => {
    cy.visit("/dashboard");
    cy.get('a[href="/dashboard/account"]').first().click();
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
    cy.contains("Celebration").should("be.visible");
  });
});
