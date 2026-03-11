describe("Sign Up", () => {
  beforeEach(() => {
    cy.visit("/auth?signup=coach&token=e2e-waitlist-token");
    cy.contains("Create your account").should("be.visible");
    cy.findByRole("button", { name: "Coach" }).click();
  });

  it("shows signup form with all fields", () => {
    cy.findByLabelText("First name").should("be.visible");
    cy.findByLabelText("Last name").should("be.visible");
    cy.findByLabelText("Email").should("be.visible");
    cy.findByLabelText("Password").should("be.visible");
    cy.findByRole("button", { name: "Athlete" }).should("be.visible");
    cy.findByRole("button", { name: "Coach" }).should("be.visible");
    cy.findByRole("button", { name: "Create Account" }).should("be.visible");
  });

  it("shows error when first and last name are too short", () => {
    cy.findByLabelText("First name").type("A");
    cy.findByLabelText("Last name").type("B");
    cy.findByLabelText("Email").type("newuser@test.pretvia.com");
    cy.findByLabelText("Password").type("TestPass123!", { log: false });
    cy.findByRole("button", { name: "Create Account" }).click();
    cy.contains("First and last name must be at least 2 characters each").should(
      "be.visible"
    );
  });

  it("shows error when password is too short", () => {
    cy.findByLabelText("First name").type("New");
    cy.findByLabelText("Last name").type("User");
    cy.findByLabelText("Email").type("newuser@test.pretvia.com");
    cy.findByLabelText("Password").type("12345", { log: false });
    cy.findByRole("button", { name: "Create Account" }).click();
    cy.findByLabelText("Password").then(($el) => {
      expect(($el[0] as HTMLInputElement).validity.valid).to.be.false;
    });
  });

  it("shows error when email already exists", () => {
    cy.findByLabelText("First name").type("E2E");
    cy.findByLabelText("Last name").type("Athlete");
    cy.findByLabelText("Email").type("athlete@test.pretvia.com");
    cy.findByLabelText("Password").type("TestPass123!", { log: false });
    cy.findByRole("button", { name: "Create Account" }).click();
    cy.contains("An account with this email already exists").should(
      "be.visible"
    );
  });

  it("can switch back to sign in", () => {
    cy.findByRole("button", { name: /already have an account/i }).click();
    cy.contains("Welcome back").should("be.visible");
    cy.findByRole("button", { name: "Sign In" }).should("be.visible");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.viewport(375, 667);
      cy.visit("/auth?signup=coach&token=e2e-waitlist-token");
      cy.contains("Create your account").should("be.visible");
      cy.findByRole("button", { name: "Coach" }).click();
    });

    it("shows signup form with all fields on small screen", () => {
      cy.findByLabelText("First name").should("be.visible");
      cy.findByLabelText("Last name").should("be.visible");
      cy.findByLabelText("Email").should("be.visible");
      cy.findByLabelText("Password").should("be.visible");
      cy.findByRole("button", { name: "Create Account" }).should("be.visible");
    });

    it("shows validation error on small screen", () => {
      cy.findByLabelText("First name").type("A");
      cy.findByLabelText("Last name").type("B");
      cy.findByLabelText("Email").type("newuser@test.pretvia.com");
      cy.findByLabelText("Password").type("TestPass123!", { log: false });
      cy.findByRole("button", { name: "Create Account" }).click();
      cy.contains("First and last name must be at least 2 characters each").should("be.visible");
    });

    it("can switch back to sign in on small screen", () => {
      cy.findByRole("button", { name: /already have an account/i }).click();
      cy.contains("Welcome back").should("be.visible");
    });
  });
});

describe("Sign Up — no-token coach state", () => {
  it("shows waitlist message and 'Join the waitlist' button when Coach selected without token", () => {
    cy.visit("/auth");
    cy.findByRole("button", { name: /don't have an account/i }).click();
    cy.contains("Create your account").should("be.visible");
    cy.findByRole("button", { name: "Coach" }).click();
    cy.contains("Pretvia is currently invite-only for coaches").should("be.visible");
    cy.findByRole("button", { name: "Join the waitlist" }).should("be.visible");
    cy.findByLabelText("First name").should("not.exist");
  });

  it("'Join the waitlist' button navigates to /waitlist", () => {
    cy.visit("/auth");
    cy.findByRole("button", { name: /don't have an account/i }).click();
    cy.findByRole("button", { name: "Coach" }).click();
    cy.findByRole("button", { name: "Join the waitlist" }).click();
    cy.url().should("include", "/waitlist");
  });

  it("?signup=coach param auto-opens signup tab", () => {
    cy.visit("/auth?signup=coach");
    cy.contains("Create your account").should("be.visible");
  });
});
