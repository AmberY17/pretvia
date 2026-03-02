describe("Coach Review Status", () => {
  before(() => {
    cy.loginAsAthlete();
    cy.request({
      method: "POST",
      url: "/api/logs",
      body: {
        emoji: "\u{1F4AA}",
        timestamp: new Date().toISOString(),
        visibility: "coach",
        notes: "E2E coach review test",
        tags: [],
      },
    }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard");
  });

  it("shows review status badge on shared log", () => {
    cy.contains("E2E coach review test").should("be.visible");
    cy.contains("Pending").should("be.visible");
  });

  it("can change status via dropdown", () => {
    cy.contains("Pending").first().click();
    cy.contains("Reviewed").click();
    cy.contains("Reviewed").should("be.visible");
  });
});
