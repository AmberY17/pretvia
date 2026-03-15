# Cypress E2E — Pretvia

## Running Tests

```bash
pnpm e2e:ci       # Headless, starts dev server automatically (CI-safe)
pnpm cypress run --spec "cypress/e2e/path/to/spec.cy.ts"  # Single spec
```

Credentials live in `cypress.env.json` (not committed). Seed test accounts with `pnpm seed:test`.

## Spec Organization

```
cypress/e2e/
  athlete/
    dashboard.cy.ts          # Feed, logs, comments, filters, sign-out
    account-settings.cy.ts   # Emoji, training slots, celebration, delete account
  coach/
    dashboard.cy.ts          # Feed, announcements, check-ins, comments, filters, sign-out
    account-settings.cy.ts   # Emoji, filter order, delete account
    manage-group.cy.ts       # Roles, training schedule, athlete management, invites, invite redemption
    attendance.cy.ts         # Attendance session selection and recording
  guardian/
    dashboard.cy.ts          # Calendar view, athlete selection, sign-out
  cross-role/     # Multi-role interaction flows (coach ↔ athlete ↔ guardian)
  auth/
    auth.cy.ts               # Login, signup, logout, forgot/reset password, signed-in modal
  edge-cases/     # Error states, empty states
  shared/         # Flows shared across roles
  waitlist/       # Waitlist signup flow
```

Cross-role tests belong in `cypress/e2e/cross-role/` — not in role-specific folders.

**No mobile `context()` blocks in any spec — desktop-first (1280×900).** All specs run at the default desktop viewport.

## Login Commands

```typescript
cy.loginAsAthlete()    // athlete@test.pretvia.com
cy.loginAsCoach()      // coach@test.pretvia.com
cy.loginAsGuardian()   // guardian@test.pretvia.com
cy.login(email, password)  // arbitrary account
```

Sessions are cached with `cy.session()` — login cost is paid once per spec run.

## Custom Data Commands

```typescript
cy.createLog(attrs)          // POST /api/logs — spreads attrs, returns log object
cy.deleteLog(id)             // DELETE /api/logs?id=...
cy.createCheckin(attrs)      // POST /api/checkins — returns checkin object
cy.deleteCheckin(id)         // DELETE /api/checkins?id=...
```

## Selector Priority

Always use the first applicable option — stop as soon as one fits:

1. **Role + accessible name** (preferred)
   ```typescript
   cy.findByRole("button", { name: "Log Session" })
   cy.findByRole("link", { name: /dashboard/i })
   ```

2. **Label text** — for form inputs
   ```typescript
   cy.findByLabelText(/email/i)
   ```

3. **Element type + text content**
   ```typescript
   cy.contains("button", "Save")
   cy.contains('[role="button"]', "E2E log note")
   ```

4. **`data-testid`** — structural grouping with no semantic role (log cards, checkin cards)
   ```typescript
   cy.contains('[data-testid="checkin-card"]', "Session title")
   ```

5. **`aria-label`** — icon-only buttons
   ```typescript
   cy.get('[aria-label="Delete comment"]')
   cy.get('[aria-label="Send comment"]')
   ```

**Never use:** CSS class selectors, DOM traversal chains (`.parent().parent()`), bare element selectors (`cy.get('div')`), `placeholder` attribute selectors (`cy.get('textarea[placeholder="..."]')`), or `button[title="..."]` title attribute selectors.

For dynamic button labels (e.g. feedback toggle: "Feedback" / "1 comment" / "Hide feedback"), use a regex that covers all states:
```typescript
cy.contains("button", /feedback|comment/i)
```

For search inputs use `cy.findByRole("searchbox")` (search inputs have `type="search"`).

For role name inputs (only textbox in section), use `cy.findByRole("textbox")`.

For attendance status buttons use `cy.findByRole("button", { name: "Present" })` etc. — **not** `button[title="..."]`.

## data-testid Inventory

| Element | `data-testid` |
|---------|--------------|
| Check-in card | `checkin-card` |
| Athlete row | `athlete-row` |
| Comment item | `comment-item` |

Log cards have `role="button"` on their root element — use `cy.contains('[role="button"]', "note text")`.

## Cross-Role Test Pattern

```typescript
before(() => {
  cy.loginAsCoach();
  // set up fixture data via API (cy.request), not via UI
  cy.createCheckin({ title: "E2E ..." }).then((c) => { checkinId = c.id });
});

after(() => {
  cy.loginAsCoach();
  cy.deleteCheckin(checkinId);
});

it("...", () => {
  cy.loginAsAthlete();
  cy.visit("/dashboard");
  // assert what the second role sees
});
```

Post setup data via `cy.request` (not UI) to avoid session-switching timing issues.
