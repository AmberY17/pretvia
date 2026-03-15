describe("Sign In", () => {
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

describe("Sign Out", () => {
  it("redirects to landing after sign out from dashboard", () => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
    cy.contains("Training Feed").should("be.visible");
    cy.findByRole("button", { name: "Sign Out" }).click();
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  it("clears session - dashboard redirects to auth when revisiting", () => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
    cy.contains("Training Feed").should("be.visible");
    cy.findByRole("button", { name: "Sign Out" }).click();
    cy.clearAllCookies();
    cy.visit("/dashboard");
    cy.url().should("include", "/auth");
  });
});

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
    cy.contains("First and last name must be at least 2 characters each").should("be.visible");
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
    cy.contains("An account with this email already exists").should("be.visible");
  });

  it("shows waitlist message for Coach without token", () => {
    cy.visit("/auth");
    cy.findByRole("button", { name: /don't have an account/i }).click();
    cy.contains("Create your account").should("be.visible");
    cy.findByRole("button", { name: "Coach" }).click();
    cy.contains("Pretvia is currently invite-only for coaches").should("be.visible");
    cy.findByRole("button", { name: "Join the waitlist" }).should("be.visible");
    cy.findByLabelText("First name").should("not.exist");
  });

  it("can switch back to sign in", () => {
    cy.findByRole("button", { name: /already have an account/i }).click();
    cy.contains("Welcome back").should("be.visible");
    cy.findByRole("button", { name: "Sign In" }).should("be.visible");
  });

  it("?signup=coach param auto-opens signup tab", () => {
    cy.visit("/auth?signup=coach");
    cy.contains("Create your account").should("be.visible");
  });
});

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

  it("shows success message for unknown email — no enumeration", () => {
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
});

describe("Reset Password", () => {
  it("shows error when visiting without token", () => {
    cy.visit("/auth/reset-password");
    cy.contains("Invalid or missing reset link").should("be.visible");
  });

  it("shows form with invalid token and error on submit", () => {
    cy.visit("/auth/reset-password?token=invalid-token-123");
    cy.contains("Set new password").should("be.visible");
    cy.findByLabelText("New password").type("NewPass123!", { log: false });
    cy.findByLabelText("Confirm password").type("NewPass123!", { log: false });
    cy.findByRole("button", { name: "Update password" }).click();
    cy.contains("Invalid or expired").should("be.visible");
  });
});

describe("Signed-in modal", () => {
  it("shows choice modal when visiting /auth while logged in", () => {
    cy.loginAsAthlete();
    cy.visit("/auth");
    cy.contains("You're signed in").should("be.visible");
    cy.contains("Continue as").should("be.visible");
    cy.contains("Sign in with different account").should("be.visible");
  });

  it("can continue as current user", () => {
    cy.loginAsAthlete();
    cy.visit("/auth");
    cy.findByRole("button", { name: /Continue as/ }).click();
    cy.url().should("include", "/dashboard");
    cy.contains("Training Feed").should("be.visible");
  });

  it("can choose to sign in as different user", () => {
    cy.loginAsAthlete();
    cy.visit("/auth");
    cy.findByRole("button", {
      name: "Sign in with different account",
    }).click();
    cy.contains("Welcome back").should("be.visible");
    cy.findByLabelText("Email").should("be.visible");
    cy.visit("/dashboard");
    cy.url().should("include", "/auth");
  });
});
