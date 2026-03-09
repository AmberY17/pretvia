describe("Cross-Role: Check-in Progress", () => {
  let checkinId: string;

  before(() => {
    cy.loginAsCoach();
    cy.request("/api/checkins?mode=all").then((res) => {
      (res.body.checkins ?? [])
        .filter((c: { title?: string }) => c.title?.includes("E2E Cross-Role Checkin"))
        .forEach((c: { id?: string; _id?: string }) => cy.deleteCheckin(c.id ?? c._id ?? ""));
    });
    cy.createCheckin({ title: "E2E Cross-Role Checkin" }).then((c) => {
      checkinId = c.id ?? c._id;
    });
  });

  after(() => {
    cy.loginAsCoach();
    if (checkinId) cy.deleteCheckin(checkinId);
    cy.loginAsAthlete();
    cy.request("/api/logs").then((res) => {
      (res.body.logs ?? [])
        .filter((l: { checkinId?: string; notes?: string; id?: string; _id?: string }) =>
          l.checkinId === checkinId || l.notes?.includes("E2E checkin log")
        )
        .forEach((l: { id?: string; _id?: string }) => cy.deleteLog(l.id ?? l._id ?? ""));
    });
  });

  it("athlete sees check-in card with 0/N progress and Log Session button", () => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
    cy.contains('[data-testid="checkin-card"]', "E2E Cross-Role Checkin").within(() => {
      cy.contains(/0\/\d+ checked in/).should("be.visible");
      cy.findByRole("button", { name: "Log Session" }).should("be.visible");
    });
  });

  it("coach sees progress increment after athlete logs session", () => {
    cy.loginAsAthlete();
    cy.request({
      method: "POST",
      url: "/api/logs",
      body: {
        emoji: "💪",
        timestamp: new Date().toISOString(),
        visibility: "coach",
        notes: "E2E checkin log",
        tags: [],
        checkinId,
      },
    }).then((res) => expect(res.status).to.eq(200));

    cy.loginAsCoach();
    cy.visit("/dashboard");
    cy.contains('[data-testid="checkin-card"]', "E2E Cross-Role Checkin").within(() => {
      cy.contains(/1\/\d+ checked in/).should("be.visible");
    });
  });

  it("athlete sees Logged badge after logging (not Log Session button)", () => {
    cy.loginAsAthlete();
    cy.visit("/dashboard");
    cy.contains('[data-testid="checkin-card"]', "E2E Cross-Role Checkin").within(() => {
      cy.contains("Logged").should("be.visible");
      cy.findByRole("button", { name: "Log Session" }).should("not.exist");
    });
  });

  context("Mobile viewport", () => {
    it("athlete sees check-in card and Log Session on mobile (before logging)", () => {
      cy.loginAsCoach();
      cy.createCheckin({ title: "E2E Cross-Role Checkin Mobile" }).then((mobileCheckin) => {
        const mobileCheckinId = mobileCheckin.id ?? mobileCheckin._id;
        cy.loginAsAthlete();
        cy.viewport(375, 667);
        cy.visit("/dashboard");
        cy.contains('[data-testid="checkin-card"]', "E2E Cross-Role Checkin Mobile").within(() => {
          cy.contains(/0\/\d+ checked in/).should("be.visible");
          cy.findByRole("button", { name: "Log Session" }).should("be.visible");
        });
        cy.loginAsCoach();
        cy.deleteCheckin(mobileCheckinId);
      });
    });
  });
});
