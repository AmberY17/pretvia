describe("Sign Up", () => {
  beforeEach(() => {
    cy.visit("/auth");
    cy.contains("Don't have an account? Sign up").click();
    cy.contains("Create your account").should("be.visible");
  });

  it("shows signup form with all fields", () => {
    cy.get("input#displayName").should("be.visible");
    cy.get("input#email").should("be.visible");
    cy.get("input#password").should("be.visible");
    cy.contains("button", "Athlete").should("be.visible");
    cy.contains("button", "Coach").should("be.visible");
    cy.contains("button", "Create Account").should("be.visible");
  });

  it("shows error when display name is too short", () => {
    cy.get("input#displayName").type("A");
    cy.get("input#email").type("newuser@test.pretvia.com");
    cy.get("input#password").type("TestPass123!", { log: false });
    cy.contains("button", "Create Account").click();
    cy.contains("Display name must be at least 2 characters").should(
      "be.visible"
    );
  });

  it("shows error when password is too short", () => {
    cy.get("input#displayName").type("New User");
    cy.get("input#email").type("newuser@test.pretvia.com");
    cy.get("input#password").type("12345", { log: false });
    cy.contains("button", "Create Account").click();
    cy.get("input#password").then(($el) => {
      expect(($el[0] as HTMLInputElement).validity.valid).to.be.false;
    });
  });

  it("shows error when email already exists", () => {
    cy.get("input#displayName").type("E2E Athlete");
    cy.get("input#email").type("athlete@test.pretvia.com");
    cy.get("input#password").type("TestPass123!", { log: false });
    cy.contains("button", "Create Account").click();
    cy.contains("An account with this email already exists").should(
      "be.visible"
    );
  });

  it("can switch back to sign in", () => {
    cy.contains("Already have an account? Sign in").click();
    cy.contains("Welcome back").should("be.visible");
    cy.contains("button", "Sign In").should("be.visible");
  });
});
