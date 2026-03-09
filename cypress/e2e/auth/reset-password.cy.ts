describe("Reset Password", () => {
  it("shows error when visiting without token", () => {
    cy.visit("/auth/reset-password");
    cy.contains("Invalid or missing reset link").should("be.visible");
  });

  it("shows form when visiting with invalid token", () => {
    cy.visit("/auth/reset-password?token=invalid-token-123");
    cy.contains("Set new password").should("be.visible");
    cy.findByLabelText("New password").type("NewPass123!", { log: false });
    cy.findByLabelText("Confirm password").type("NewPass123!", { log: false });
    cy.findByRole("button", { name: "Update password" }).click();
    cy.contains("Invalid or expired").should("be.visible");
  });

  context("Mobile viewport", () => {
    it("shows reset password form on small screen", () => {
      cy.viewport(375, 667);
      cy.visit("/auth/reset-password?token=invalid-token-123");
      cy.contains("Set new password").should("be.visible");
      cy.findByLabelText("New password").should("be.visible");
      cy.findByLabelText("Confirm password").should("be.visible");
      cy.findByRole("button", { name: "Update password" }).should("be.visible");
    });
  });
});
