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
  athlete/        # Athlete-only flows
  coach/          # Coach-only flows
  guardian/       # Guardian dashboard + calendar
  cross-role/     # Multi-role interaction flows (coach ↔ athlete ↔ guardian)
  auth/           # Login, signup, session
  account/        # Profile, account deletion
  edge-cases/     # Error states, empty states
  mobile/         # Mobile-only nav (hamburger, coach popover)
  shared/         # Flows shared across roles
```

Cross-role tests belong in `cypress/e2e/cross-role/` — not in role-specific folders.

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

**Never use:** CSS class selectors, DOM traversal chains (`.parent().parent()`), bare element selectors (`cy.get('div')`), or `placeholder` attribute selectors (`cy.get('textarea[placeholder="..."]')`).

For dynamic button labels (e.g. feedback toggle: "Feedback" / "1 comment" / "Hide feedback"), use a regex that covers all states:
```typescript
cy.contains("button", /feedback|comment/i)
```

## data-testid Inventory

| Element | `data-testid` |
|---------|--------------|
| Check-in card | `checkin-card` |

Log cards have `role="button"` on their root element — use `cy.contains('[role="button"]', "note text")`.

## Mobile Testing

- Add `context("Mobile viewport", ...)` blocks **within each feature file**
- Exception: `mobile/navigation.cy.ts` for hamburger/coach popover nav
- Set `cy.viewport(375, 667)` **before** `cy.visit()` so media queries fire at the right size
- Coach on mobile: sidebar hidden (`lg:flex`), use `cy.get('[aria-label="Open menu"]')`
- Athlete on mobile: sidebar hidden, filter pills replace sidebar collapsibles
- Guardian on mobile: sidebar hidden, use `cy.findByRole("button", { name: /select athletes/i })` to open the pair selector popover

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
