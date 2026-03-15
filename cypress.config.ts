import { defineConfig } from "cypress";
import fs from "fs";

export default defineConfig({
  projectId: "ocq4yh",
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 10000,
    video: false,
    retries: { runMode: 2, openMode: 0 },
    setupNodeEvents(on, _config) {
      on("before:run", () => {
        fs.rmSync("cypress/screenshots", { recursive: true, force: true });
      });
    },
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
  },
});
