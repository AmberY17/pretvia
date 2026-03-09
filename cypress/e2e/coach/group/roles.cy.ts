describe("Coach Group Roles", () => {
  before(() => {
    cy.loginAsCoach();
    // Clean up roles created in previous E2E runs
    cy.request("/api/groups").then((res) => {
      const groups = res.body.groups ?? [];
      const group = groups[0];
      if (!group) return;
      const groupId = group.id ?? group._id;
      cy.request(`/api/groups/${groupId}/roles`).then((r) => {
        const roles = r.body.roles ?? [];
        roles
          .filter((role: { name: string }) => role.name.startsWith("E2E Role"))
          .forEach((role: { id: string }) => {
            cy.request({
              method: "DELETE",
              url: `/api/groups/${groupId}/roles?roleId=${role.id}`,
              failOnStatusCode: false,
            });
          });
      });
    });
  });

  after(() => {
    cy.loginAsCoach();
    cy.request("/api/groups").then((res) => {
      const groups = res.body.groups ?? [];
      const group = groups[0];
      if (!group) return;
      const groupId = group.id ?? group._id;
      cy.request(`/api/groups/${groupId}/roles`).then((r) => {
        const roles = r.body.roles ?? [];
        roles
          .filter((role: { name: string }) => role.name.startsWith("E2E Role"))
          .forEach((role: { id: string }) => {
            cy.request({
              method: "DELETE",
              url: `/api/groups/${groupId}/roles?roleId=${role.id}`,
              failOnStatusCode: false,
            });
          });
      });
    });
  });

  beforeEach(() => {
    cy.loginAsCoach();
    cy.visit("/dashboard/group");
  });

  it("shows the Roles section on the group management page", () => {
    cy.contains("Roles").should("be.visible");
    cy.contains("Add Role").should("be.visible");
  });

  it("can create a new role", () => {
    cy.get('input[placeholder*="Sabre"]').type("E2E Role Alpha");
    cy.contains("button", "Add Role").click();
    cy.contains("E2E Role Alpha").should("be.visible");
  });

  it("can edit an existing role", () => {
    cy.contains("button", "E2E Role Alpha").click();
    cy.get('input[placeholder*="Sabre"]').clear().type("E2E Role Beta");
    cy.contains("button", "Update").click();
    cy.contains("E2E Role Beta").should("be.visible");
    cy.contains("E2E Role Alpha").should("not.exist");
  });

  it("can delete a role with confirmation", () => {
    cy.contains("button", "E2E Role Beta").click();
    cy.contains("button", "Delete").click();
    cy.contains("Athletes will lose this role assignment.").should("be.visible");
    cy.findByRole("button", { name: "Delete" }).click();
    cy.contains("E2E Role Beta").should("not.exist");
  });

  it("can cancel role editing without saving", () => {
    cy.get('input[placeholder*="Sabre"]').type("E2E Role Cancel");
    cy.contains("button", "Add Role").click();
    cy.contains("button", "E2E Role Cancel").click();
    cy.get('input[placeholder*="Sabre"]').clear().type("E2E Role Modified");
    cy.contains("button", "Cancel").click();
    cy.contains("E2E Role Cancel").should("be.visible");
    cy.contains("E2E Role Modified").should("not.exist");
    // Clean up
    cy.contains("button", "E2E Role Cancel").click();
    cy.contains("button", "Delete").click();
    cy.findByRole("button", { name: "Delete" }).click();
  });

  context("Mobile viewport", () => {
    beforeEach(() => {
      cy.loginAsCoach();
      cy.viewport(375, 667);
      cy.visit("/dashboard/group");
    });

    it("shows the Roles section on mobile", () => {
      cy.contains("Roles").should("be.visible");
      cy.contains("Add Role").should("be.visible");
    });

    it("can create and delete a role on mobile", () => {
      cy.get('input[placeholder*="Sabre"]').type("E2E Role Mobile");
      cy.contains("button", "Add Role").click();
      cy.contains("E2E Role Mobile").should("be.visible");
      // Clean up
      cy.contains("button", "E2E Role Mobile").click();
      cy.contains("button", "Delete").click();
      cy.findByRole("button", { name: "Delete" }).click();
      cy.contains("E2E Role Mobile").should("not.exist");
    });
  });
});
