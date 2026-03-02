import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 10000,
    video: false,
    retries: { runMode: 2, openMode: 0 },
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
  },
});
