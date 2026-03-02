describe("Signed-in modal (arrive at /auth while logged in)", () => {
  it("shows choice modal when visiting /auth while already logged in", () => {
    cy.loginAsAthlete();
    cy.visit("/auth");
    cy.contains("You're signed in").should("be.visible");
    cy.contains("Continue as").should("be.visible");
    cy.contains("Sign in with different account").should("be.visible");
  });

  it("Continue as navigates to dashboard", () => {
    cy.loginAsAthlete();
    cy.visit("/auth");
    cy.contains("button", /Continue as/).click();
    cy.url().should("include", "/dashboard");
    cy.contains("Training Feed").should("be.visible");
  });

  it("Sign in with different account clears session and shows form", () => {
    cy.loginAsAthlete();
    cy.visit("/auth");
    cy.contains("button", "Sign in with different account").click();
    cy.contains("Welcome back").should("be.visible");
    cy.get("input#email").should("be.visible");
    cy.visit("/dashboard");
    cy.url().should("include", "/auth");
  });
});
