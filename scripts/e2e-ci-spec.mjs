#!/usr/bin/env node
/* eslint-disable no-undef -- Node.js script; process/console are globals */
/**
 * Run a single E2E spec with CI environment (starts dev server, seeds, etc.).
 * Usage: pnpm e2e:ci:spec <spec-path>
 *        pnpm e2e:ci:spec:record <spec-path>  (or pnpm e2e:ci:spec --record <spec-path>)
 */
import { execSync } from "child_process";

const args = process.argv.slice(2);
const record = args.includes("--record");
const spec = args.find((a) => a !== "--record");
if (!spec) {
  console.error("Usage: pnpm e2e:ci:spec <spec-path> [--record]");
  console.error("Example: pnpm e2e:ci:spec cypress/e2e/athlete/log-detail.cy.ts");
  process.exit(1);
}

const cypressArgs = `--spec ${JSON.stringify(spec)}${record ? " --record" : ""}`;
execSync(
  `npx start-server-and-test dev:skip-email http://localhost:3000 "cypress run ${cypressArgs}"`,
  { stdio: "inherit" }
);
