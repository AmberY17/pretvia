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
| `pnpm e2e:ci` | Start dev server + wait + run tests (single command for CI) |

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
