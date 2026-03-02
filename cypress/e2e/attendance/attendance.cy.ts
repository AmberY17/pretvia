describe("Attendance (Coach)", () => {
  beforeEach(() => {
    cy.loginAsCoach();
  });

  it("can navigate to Attendance", () => {
    cy.visit("/dashboard");
    cy.contains("Attendance").click();
    cy.url().should("include", "/dashboard/attendance");
  });

  it("shows attendance page", () => {
    cy.visit("/dashboard/attendance");
    cy.contains(/Attendance|Session/).should("be.visible");
  });
});
