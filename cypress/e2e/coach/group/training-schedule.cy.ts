describe("Group Training Schedule", () => {
  before(() => {
    cy.loginAsCoach();
    // Pre-save a training slot so SWR refetches return non-empty data,
    // preventing the useEffect from resetting local state to empty.
    cy.request("/api/groups?mode=coach-groups").then((res) => {
      const groupId = (res.body.groups ?? [])[0]?.id;
      if (groupId) {
        cy.request({
          method: "PUT",
          url: `/api/groups/${groupId}/training-schedule`,
          body: { trainingSchedule: [{ dayOfWeek: 1, time: "09:00" }] },
        });
      }
    });
  });

  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard/group");
  });

  it("shows Training Schedule section on the group management page", () => {
    cy.contains(/Training Schedule/i).should("be.visible");
  });

  it("shows Add Slot button in the training schedule section", () => {
    cy.contains(/Training Schedule/i)
      .closest("section")
      .within(() => {
        cy.contains(/Add Slot|Add/i).should("be.visible");
      });
  });

  it("can add a training slot", () => {
    cy.contains(/Training Schedule/i)
      .closest("section")
      .within(() => {
        cy.contains(/Add schedule slot|Add Slot|Add/i).click();
      });
    cy.get('[aria-label="Select day of week"]').should("be.visible");
  });

  it("can save the training schedule", () => {
    cy.contains(/Training Schedule/i)
      .closest("section")
      .within(() => {
        cy.contains(/Add schedule slot|Add Slot|Add/i).click();
      });
    cy.get('[aria-label="Select day of week"]').should("be.visible");
    cy.contains(/Training Schedule/i)
      .closest("section")
      .within(() => {
        cy.contains("button", /Save/i).click();
      });
    cy.contains(/saved|updated|applied/i).should("be.visible");
  });

  it("athlete can sync group schedule from account page", () => {
    cy.loginAsAthlete();
    cy.visit("/dashboard/account");
    cy.contains(/Sync with group/i).should("be.visible");
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(375, 667);
      cy.visit("/dashboard/group");
    });

    it("shows Training Schedule section on mobile", () => {
      cy.contains(/Training Schedule/i).should("be.visible");
    });

    it("shows Add Slot button on mobile", () => {
      cy.contains(/Training Schedule/i)
        .closest("section")
        .within(() => {
          cy.contains(/Add Slot|Add/i).should("be.visible");
        });
    });

    it("can add a training slot on mobile", () => {
      cy.contains(/Training Schedule/i)
        .closest("section")
        .within(() => {
          cy.contains(/Add schedule slot|Add Slot|Add/i).click();
        });
      cy.get('[aria-label="Select day of week"]').should("be.visible");
    });
  });
});
