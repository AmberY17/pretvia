describe("Waitlist page", () => {
  beforeEach(() => {
    cy.visit("/waitlist");
  });

  it("renders form fields and submit button", () => {
    cy.findByLabelText(/first name/i).should("be.visible");
    cy.findByLabelText(/last name/i).should("be.visible");
    cy.findByLabelText(/email/i).should("be.visible");
    cy.findByLabelText(/club name/i).should("be.visible");
    cy.contains("During the beta, each club can create up to 2 groups.").should("be.visible");
    cy.contains("Group 1").should("be.visible");
    cy.contains("Group 2 (optional)").should("be.visible");
    cy.findByRole("button", { name: "Request early access" }).should("be.visible");
  });

  it("HTML5 required fires on empty first name", () => {
    cy.findByRole("button", { name: "Request early access" }).click();
    cy.findByLabelText(/first name/i).then(($el) => {
      expect(($el[0] as HTMLInputElement).validity.valueMissing).to.be.true;
    });
  });

  it("HTML5 required fires on empty email", () => {
    cy.findByLabelText(/first name/i).type("Jane");
    cy.findByLabelText(/last name/i).type("Smith");
    cy.findByRole("button", { name: "Request early access" }).click();
    cy.findByLabelText(/email/i).then(($el) => {
      expect(($el[0] as HTMLInputElement).validity.valueMissing).to.be.true;
    });
  });

  it("shows error when Group 1 has no age group selected", () => {
    cy.findByLabelText(/first name/i).type("Jane");
    cy.findByLabelText(/last name/i).type("Smith");
    cy.findByLabelText(/email/i).type(`nogroup-${Date.now()}@example.com`);
    cy.findByLabelText(/club name/i).type("Riverside FC");
    cy.findByRole("button", { name: "Request early access" }).click();
    cy.contains("Please select at least one age group for Group 1.").should("be.visible");
  });

  it("valid unique submission shows success state", () => {
    const uniqueEmail = `waitlist-${Date.now()}@example.com`;
    cy.findByLabelText(/first name/i).type("Jane");
    cy.findByLabelText(/last name/i).type("Smith");
    cy.findByLabelText(/email/i).type(uniqueEmail);
    cy.findByLabelText(/club name/i).type("Riverside FC");
    // Select a Group 1 age group pill
    cy.contains("Group 1").parent().contains("button", "U12").click();
    cy.findByRole("button", { name: "Request early access" }).click();
    cy.findByRole("button", { name: "Request early access" }).should("not.exist");
    cy.contains("You're on the list!").should("be.visible");
  });

  it("duplicate email shows error toast", () => {
    const email = `dup-waitlist-${Date.now()}@example.com`;

    function fillAndSubmit() {
      cy.findByLabelText(/first name/i).type("Jane");
      cy.findByLabelText(/last name/i).type("Smith");
      cy.findByLabelText(/email/i).type(email);
      cy.findByLabelText(/club name/i).type("Riverside FC");
      cy.contains("Group 1").parent().contains("button", "U12").click();
      cy.findByRole("button", { name: "Request early access" }).click();
    }

    fillAndSubmit();
    cy.contains("You're on the list!").should("be.visible");

    cy.visit("/waitlist");
    fillAndSubmit();
    cy.contains("already on the waitlist").should("be.visible");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.viewport(375, 667);
      cy.visit("/waitlist");
    });

    it("waitlist form renders on mobile", () => {
      cy.findByLabelText(/first name/i).should("be.visible");
      cy.findByLabelText(/email/i).should("be.visible");
      cy.findByRole("button", { name: "Request early access" }).should("be.visible");
    });

    it("valid submission shows success state on mobile", () => {
      const uniqueEmail = `waitlist-mobile-${Date.now()}@example.com`;
      cy.findByLabelText(/first name/i).type("Mobile");
      cy.findByLabelText(/last name/i).type("User");
      cy.findByLabelText(/email/i).type(uniqueEmail);
      cy.findByLabelText(/club name/i).type("Mobile FC");
      cy.contains("Group 1").parent().contains("button", "U14").click();
      cy.findByRole("button", { name: "Request early access" }).click();
      cy.contains("You're on the list!").should("be.visible");
    });
  });
});

describe("Coach signup with waitlist token", () => {
  it("shows full signup form when visiting with a valid token", () => {
    cy.visit("/auth?signup=coach&token=e2e-waitlist-token");
    cy.contains("Create your account").should("be.visible");
    cy.findByRole("button", { name: "Coach" }).click();
    cy.findByLabelText("First name").should("be.visible");
    cy.findByLabelText("Last name").should("be.visible");
    cy.findByLabelText("Email").should("be.visible");
    cy.findByLabelText("Password").should("be.visible");
    cy.findByRole("button", { name: "Create Account" }).should("be.visible");
  });

  it("submitting valid form shows verification toast", () => {
    // Clean up any lingering pending signup first
    cy.request({
      method: "POST",
      url: "/api/waitlist",
      body: {},
      failOnStatusCode: false,
    });

    cy.visit("/auth?signup=coach&token=e2e-waitlist-token");
    cy.contains("Create your account").should("be.visible");
    cy.findByRole("button", { name: "Coach" }).click();

    cy.findByLabelText("First name").type("E2E");
    cy.findByLabelText("Last name").type("Waitlist");
    cy.findByLabelText("Email").type("e2e-waitlist@test.pretvia.com");
    cy.findByLabelText("Password").type("TestPass123!", { log: false });
    cy.findByRole("button", { name: "Create Account" }).click();

    cy.contains("Check your email to verify your account.").should("be.visible");
  });
});
