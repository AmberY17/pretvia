describe("Reset Password", () => {
  it("shows error when visiting without token", () => {
    cy.visit("/auth/reset-password");
    cy.contains("Invalid or missing reset link").should("be.visible");
  });

  it("shows form when visiting with invalid token", () => {
    cy.visit("/auth/reset-password?token=invalid-token-123");
    cy.contains("Set new password").should("be.visible");
    cy.get("input#new-password").type("NewPass123!", { log: false });
    cy.get("input#confirm-password").type("NewPass123!", { log: false });
    cy.contains("button", "Update password").click();
    cy.contains("Invalid or expired").should("be.visible");
  });
});
