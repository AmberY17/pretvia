describe("Login", () => {
  beforeEach(() => {
    cy.visit("/auth");
  });

  it("shows login form by default", () => {
    cy.contains("Welcome back").should("be.visible");
    cy.get("input#email").should("be.visible");
    cy.get("input#password").should("be.visible");
    cy.contains("button", "Sign In").should("be.visible");
  });

  it("redirects to dashboard on valid credentials", () => {
    const email = Cypress.env("ATHLETE_EMAIL") ?? "athlete@test.pretvia.com";
    const password = Cypress.env("ATHLETE_PASSWORD") ?? "TestPass123!";
    cy.get("input#email").type(email);
    cy.get("input#password").type(password, { log: false });
    cy.contains("button", "Sign In").click();
    cy.url().should("include", "/dashboard");
    cy.contains("Training Feed").should("be.visible");
  });

  it("shows error on invalid password", () => {
    cy.get("input#email").type("athlete@test.pretvia.com");
    cy.get("input#password").type("WrongPassword123!", { log: false });
    cy.contains("button", "Sign In").click();
    cy.contains("Invalid email or password").should("be.visible");
    cy.url().should("include", "/auth");
  });

  it("shows error when email and password are empty", () => {
    cy.contains("button", "Sign In").click();
    cy.get("input#email").then(($el) => {
      expect(($el[0] as HTMLInputElement).validity.valueMissing).to.be.true;
    });
  });

  it("can switch to sign up", () => {
    cy.contains("Don't have an account? Sign up").click();
    cy.contains("Create your account").should("be.visible");
    cy.get("input#displayName").should("be.visible");
  });
});
