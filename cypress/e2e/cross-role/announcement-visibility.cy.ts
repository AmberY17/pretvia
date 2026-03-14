describe("Cross-Role: Announcement Visibility", () => {
  let announcementId: string;

  before(() => {
    cy.loginAsCoach();
    cy.request("/api/announcements").then((res) => {
      (res.body.announcements ?? [])
        .filter((a: { text?: string; id?: string }) => a.text?.includes("E2E cross-role announcement"))
        .forEach((a: { id?: string }) => cy.request("DELETE", `/api/announcements?id=${a.id}`));
    });
    cy.request({
      method: "POST",
      url: "/api/announcements",
      body: { text: "E2E cross-role announcement" },
    }).then((res) => {
      announcementId = res.body.announcement?.id ?? res.body.announcement?._id;
    });
  });

  after(() => {
    cy.loginAsCoach();
    if (announcementId) cy.request("DELETE", `/api/announcements?id=${announcementId}`);
  });

  it("coach sees own announcement in feed", () => {
    cy.loginAsCoach();
    cy.visit("/dashboard");
    cy.get("main").contains("E2E cross-role announcement").should("be.visible");
  });

  it("athlete sees coach announcement in their feed", () => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
    cy.get("main").contains("E2E cross-role announcement").should("be.visible");
  });

  context("Mobile viewport", () => {
    it("athlete sees announcement on mobile", () => {
      cy.loginAsAthlete();
      cy.viewport(375, 667);
      cy.visit("/dashboard");
      cy.get("main").contains("E2E cross-role announcement").should("be.visible");
    });
  });
});
