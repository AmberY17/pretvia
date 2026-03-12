# Cypress E2E Tests

## Prerequisites

- A running MongoDB instance (configured in `.env.local`)
- The dev server must be running (`pnpm dev`) before running tests

## Setup (required before first run)

### 1. Configure environment variables

Add the following to `.env.local`:

```
MONGODB_URI=<your MongoDB connection string>
JWT_SECRET=<your JWT secret>
TEST_ACCOUNT_EMAILS=athlete@test.pretvia.com,coach@test.pretvia.com
```

`TEST_ACCOUNT_EMAILS` is a comma-separated allow-list that restricts which accounts the seeding script may create or reset. Without it, the seed script will refuse to create test accounts (safety guard).

### 2. Seed test users (run once, or after wiping the DB)

```bash
pnpm seed:test
```

This creates two test accounts in your MongoDB database:

| Role    | Email                          | Password      |
|---------|--------------------------------|---------------|
| Athlete | athlete@test.pretvia.com       | TestPass123!  |
| Coach   | coach@test.pretvia.com         | TestPass123!  |

It also creates a shared group and assigns both users to it.

### 3. Configure Cypress credentials

Create `cypress.env.json` in the project root (already gitignored):

```json
{
  "ATHLETE_EMAIL": "athlete@test.pretvia.com",
  "ATHLETE_PASSWORD": "TestPass123!",
  "COACH_EMAIL": "coach@test.pretvia.com",
  "COACH_PASSWORD": "TestPass123!"
}
```

See `cypress.env.example.json` for the full template.

## Running Tests

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the dev server (required for all test commands) |
| `pnpm cy:open` | Open Cypress interactive GUI (dev server must already be running) |
| `pnpm cy:run` | Run all tests headlessly (dev server must already be running) |
| `pnpm e2e:ci` | Start dev server + wait + run tests (single command for CI; skips sending real emails) |
| `pnpm e2e:ci:record` | Same as `e2e:ci` but records to Cypress Cloud (requires `CYPRESS_RECORD_KEY` env var) |
| `pnpm e2e:ci:spec <path>` | Run a single spec with CI environment |
| `pnpm e2e:ci:spec:record <path>` | Run a single spec and record to Cypress Cloud |

**Cypress Cloud recording:** Set `CYPRESS_RECORD_KEY` (from cloud.cypress.io) when using `e2e:ci:record` or `e2e:ci:spec:record`. The run URL will appear in the terminal. In CI, the GitHub Actions summary includes the link when `CYPRESS_RECORD_KEY` is set as a repository secret.

When running tests manually (`pnpm dev` then `pnpm cy:run`), use `pnpm dev:skip-email` instead of `pnpm dev` so no real emails are sent (e.g. forgot-password, verification). The `e2e:ci` and `e2e:ci:record` scripts use `dev:skip-email` automatically. If you use `TEST_EMAIL_REDIRECT` in `.env.local` for development, it will not apply during E2E runs because `SKIP_EMAIL=1` prevents sending entirely.

## Test Structure

- `auth/` – login, logout, signup, forgot-password, signed-in modal, reset-password
- `athlete/` – feed, create-log, filters, edit-delete-log
- `coach/` – feed, review-status, announcement, filters
- `group/` – group management (coach only)
- `attendance/` – attendance page (coach only)
- `account/` – account settings
- `shared/` – protected routes (unauthenticated redirect checks)
- `mobile/` – viewport-specific behaviour
- `edge-cases/` – misc edge cases (links, redirects)

## Notes

- Tests use `cy.session()` to cache login cookies between tests in the same spec — this avoids re-logging in on every `it` block.
- A global `uncaught:exception` handler in `cypress/support/e2e.ts` suppresses React hydration warnings that Next.js emits in development mode; these are cosmetic and do not indicate real failures.
- `retries` is set to `2` in run-mode (`cypress.config.ts`) to handle occasional cold-start compilation delays on the first visit.
