describe("Mobile Navigation", () => {
  beforeEach(() => {
    cy.viewport(375, 667);
  });

  describe("Athlete mobile", () => {
    beforeEach(() => {
      cy.loginAsAthlete();
      cy.visit("/dashboard");
    });

    it("shows Training Feed heading", () => {
      cy.contains("Training Feed").should("be.visible");
    });

    it("shows New Log button in header", () => {
      cy.findByRole("button", { name: /new log/i }).should("be.visible");
    });

    it("shows Filter by section (mobile filter pills)", () => {
      cy.contains("Filter by").should("be.visible");
    });

    it("Account link navigates to /dashboard/account", () => {
      cy.findByRole("link", { name: /account/i }).click();
      cy.url().should("include", "/dashboard/account");
    });
  });

  describe("Coach mobile", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.visit("/dashboard");
    });

    it("shows Training Feed heading", () => {
      cy.contains("Training Feed").should("be.visible");
    });

    it("shows hamburger Open menu button", () => {
      cy.findByRole("button", { name: "Open menu" }).should("be.visible");
    });

    it("sidebar nav links are not visible (hidden on mobile)", () => {
      cy.get('a[href="/dashboard/group"]').should("not.be.visible");
    });

    it("clicking hamburger opens popover with nav links", () => {
      cy.findByRole("button", { name: "Open menu" }).click();
      cy.contains("Manage Group").should("be.visible");
      cy.contains("Attendance").should("be.visible");
      cy.contains("Account").should("be.visible");
      cy.contains("Sign out").should("be.visible");
    });

    it("clicking Manage Group navigates to /dashboard/group", () => {
      cy.findByRole("button", { name: "Open menu" }).click();
      cy.contains("Manage Group").click();
      cy.url().should("include", "/dashboard/group");
    });

    it("clicking Attendance navigates to /dashboard/attendance", () => {
      cy.findByRole("button", { name: "Open menu" }).click();
      cy.contains("Attendance").click();
      cy.url().should("include", "/dashboard/attendance");
    });

    it("clicking Account in popover navigates to /dashboard/account", () => {
      cy.findByRole("button", { name: "Open menu" }).click();
      cy.contains("Account").click();
      cy.url().should("include", "/dashboard/account");
    });

    it("clicking Sign out logs out and redirects away from dashboard", () => {
      cy.findByRole("button", { name: "Open menu" }).click();
      cy.contains("Sign out").click();
      cy.url().should("not.include", "/dashboard");
    });
  });
});
