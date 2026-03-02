describe("Forgot Password", () => {
  beforeEach(() => {
    cy.visit("/auth");
  });

  it("shows forgot password form when clicking Forgot password?", () => {
    cy.get("input#email").type("user@test.com");
    cy.contains("Forgot password?").click();
    cy.contains("Reset password").should("be.visible");
    cy.get("input#forgot-email").should("have.value", "user@test.com");
    cy.contains("Send reset link").should("be.visible");
  });

  it("shows success message after submitting valid email", () => {
    cy.contains("Forgot password?").click();
    cy.get("input#forgot-email").type("athlete@test.pretvia.com");
    cy.contains("button", "Send reset link").click();
    cy.contains("Check your email for a reset link").should("be.visible");
  });

  it("shows success message for unknown email (no enumeration)", () => {
    cy.contains("Forgot password?").click();
    cy.get("input#forgot-email").type("nonexistent@example.com");
    cy.contains("button", "Send reset link").click();
    cy.contains("Check your email for a reset link").should("be.visible");
  });

  it("can go back to sign in", () => {
    cy.contains("Forgot password?").click();
    cy.contains("Back to sign in").click();
    cy.contains("Welcome back").should("be.visible");
    cy.get("input#email").should("be.visible");
  });
});
