describe("Login", () => {
  beforeEach(() => {
    cy.visit("/auth");
  });

  it("shows login form by default", () => {
    cy.contains("Welcome back").should("be.visible");
    cy.findByLabelText("Email").should("be.visible");
    cy.findByLabelText("Password").should("be.visible");
    cy.findByRole("button", { name: "Sign In" }).should("be.visible");
  });

  it("redirects to dashboard on valid credentials", () => {
    const email = Cypress.env("ATHLETE_EMAIL") ?? "athlete@test.pretvia.com";
    const password = Cypress.env("ATHLETE_PASSWORD") ?? "TestPass123!";
    cy.findByLabelText("Email").type(email);
    cy.findByLabelText("Password").type(password, { log: false });
    cy.findByRole("button", { name: "Sign In" }).click();
    cy.url().should("include", "/dashboard");
    cy.contains("Training Feed").should("be.visible");
  });

  it("shows error on invalid password", () => {
    cy.findByLabelText("Email").type("athlete@test.pretvia.com");
    cy.findByLabelText("Password").type("WrongPassword123!", { log: false });
    cy.findByRole("button", { name: "Sign In" }).click();
    cy.contains("Invalid email or password").should("be.visible");
    cy.url().should("include", "/auth");
  });

  it("shows error when email and password are empty", () => {
    cy.findByRole("button", { name: "Sign In" }).click();
    cy.findByLabelText("Email").then(($el) => {
      expect(($el[0] as HTMLInputElement).validity.valueMissing).to.be.true;
    });
  });

  it("can switch to sign up", () => {
    cy.findByRole("button", { name: /don't have an account/i }).click();
    cy.contains("Create your account").should("be.visible");
    cy.findByRole("button", { name: "Coach" }).should("be.visible");
    cy.findByRole("button", { name: "Athlete" }).should("be.visible");
  });
});
