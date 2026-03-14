describe("Edge Cases", () => {
  it("landing page has Sign In link", () => {
    cy.visit("/");
    cy.findByRole("link", { name: /sign in/i }).should("be.visible");
  });

  it("auth page has Back to home link", () => {
    cy.visit("/auth");
    cy.findByRole("link", { name: /back to home/i }).should("be.visible");
  });

  it("reset password page has Back to sign in link", () => {
    cy.visit("/auth/reset-password?token=any");
    cy.findByRole("link", { name: /back to sign in/i }).should("be.visible");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.viewport(375, 667);
    });

    it("landing page Sign In link is visible on mobile", () => {
      cy.visit("/");
      cy.findByRole("link", { name: /sign in/i }).should("be.visible");
    });

    it("auth page Back to home link is visible on mobile", () => {
      cy.visit("/auth");
      cy.findByRole("link", { name: /back to home/i }).should("be.visible");
    });

    it("reset password page Back to sign in link is visible on mobile", () => {
      cy.visit("/auth/reset-password?token=any");
      cy.findByRole("link", { name: /back to sign in/i }).should("be.visible");
    });
  });
});
