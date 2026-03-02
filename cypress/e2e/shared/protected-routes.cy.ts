describe("Protected Routes", () => {
  it("redirects to /auth when visiting /dashboard unauthenticated", () => {
    cy.visit("/dashboard");
    cy.url().should("include", "/auth");
  });

  it("redirects to /auth when visiting /dashboard/account unauthenticated", () => {
    cy.visit("/dashboard/account");
    cy.url().should("include", "/auth");
  });

  it("redirects to /auth when visiting /dashboard/group unauthenticated", () => {
    cy.visit("/dashboard/group");
    cy.url().should("include", "/auth");
  });

  it("redirects to /auth when visiting /dashboard/attendance unauthenticated", () => {
    cy.visit("/dashboard/attendance");
    cy.url().should("include", "/auth");
  });
});
