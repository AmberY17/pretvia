describe("Edge Cases", () => {
  it("landing page has Sign In link", () => {
    cy.visit("/");
    cy.get('a[href="/auth"]').should("have.length.at.least", 1);
  });

  it("auth page has Back to home link", () => {
    cy.visit("/auth");
    cy.contains("Back to home").should("be.visible");
  });

  it("reset password page has Back to sign in link", () => {
    cy.visit("/auth/reset-password?token=any");
    cy.contains("Back to sign in").should("be.visible");
  });
});
