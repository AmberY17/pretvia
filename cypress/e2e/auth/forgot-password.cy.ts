describe("Forgot Password", () => {
  beforeEach(() => {
    cy.visit("/auth");
  });

  it("shows forgot password form when clicking Forgot password?", () => {
    cy.findByLabelText("Email").type("user@test.com");
    cy.findByRole("button", { name: "Forgot password?" }).click();
    cy.contains("Reset password").should("be.visible");
    cy.findByLabelText("Email").should("have.value", "user@test.com");
    cy.findByRole("button", { name: "Send reset link" }).should("be.visible");
  });

  it("shows success message after submitting valid email", () => {
    cy.findByRole("button", { name: "Forgot password?" }).click();
    cy.findByLabelText("Email").type("athlete@test.pretvia.com");
    cy.findByRole("button", { name: "Send reset link" }).click();
    cy.contains("Check your email for a reset link").should("be.visible");
  });

  it("shows success message for unknown email (no enumeration)", () => {
    cy.findByRole("button", { name: "Forgot password?" }).click();
    cy.findByLabelText("Email").type("nonexistent@example.com");
    cy.findByRole("button", { name: "Send reset link" }).click();
    cy.contains("Check your email for a reset link").should("be.visible");
  });

  it("can go back to sign in", () => {
    cy.findByRole("button", { name: "Forgot password?" }).click();
    cy.findByRole("button", { name: "Back to sign in" }).click();
    cy.contains("Welcome back").should("be.visible");
    cy.findByLabelText("Email").should("be.visible");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.viewport(375, 667);
      cy.visit("/auth");
    });

    it("shows forgot password form on small screen", () => {
      cy.findByRole("button", { name: "Forgot password?" }).click();
      cy.contains("Reset password").should("be.visible");
      cy.findByLabelText("Email").should("be.visible");
      cy.findByRole("button", { name: "Send reset link" }).should("be.visible");
    });

    it("shows success message after submitting on mobile", () => {
      cy.findByRole("button", { name: "Forgot password?" }).click();
      cy.findByLabelText("Email").type("athlete@test.pretvia.com");
      cy.findByRole("button", { name: "Send reset link" }).click();
      cy.contains("Check your email for a reset link").should("be.visible");
    });

    it("can go back to sign in on small screen", () => {
      cy.findByRole("button", { name: "Forgot password?" }).click();
      cy.findByRole("button", { name: "Back to sign in" }).click();
      cy.contains("Welcome back").should("be.visible");
    });
  });
});
