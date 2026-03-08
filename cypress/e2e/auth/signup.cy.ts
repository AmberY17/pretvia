describe("Sign Up", () => {
  beforeEach(() => {
    cy.visit("/auth");
    cy.contains("Don't have an account? Sign up").click();
    cy.contains("Create your account").should("be.visible");
    cy.contains("button", "Coach").click();
  });

  it("shows signup form with all fields", () => {
    cy.get("input#firstName").should("be.visible");
    cy.get("input#lastName").should("be.visible");
    cy.get("input#email").should("be.visible");
    cy.get("input#password").should("be.visible");
    cy.contains("button", "Athlete").should("be.visible");
    cy.contains("button", "Coach").should("be.visible");
    cy.contains("button", "Create Account").should("be.visible");
  });

  it("shows error when first and last name are too short", () => {
    cy.get("input#firstName").type("A");
    cy.get("input#lastName").type("B");
    cy.get("input#email").type("newuser@test.pretvia.com");
    cy.get("input#password").type("TestPass123!", { log: false });
    cy.contains("button", "Create Account").click();
    cy.contains("First and last name must be at least 2 characters each").should(
      "be.visible"
    );
  });

  it("shows error when password is too short", () => {
    cy.get("input#firstName").type("New");
    cy.get("input#lastName").type("User");
    cy.get("input#email").type("newuser@test.pretvia.com");
    cy.get("input#password").type("12345", { log: false });
    cy.contains("button", "Create Account").click();
    cy.get("input#password").then(($el) => {
      expect(($el[0] as HTMLInputElement).validity.valid).to.be.false;
    });
  });

  it("shows error when email already exists", () => {
    cy.get("input#firstName").type("E2E");
    cy.get("input#lastName").type("Athlete");
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
