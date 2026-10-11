# E2E (Cypress) Suite Assessment — 2026-10-11

Scope: all 17 specs / **150 tests** in `cypress/e2e/`, plus `cypress.config.ts`, `cypress/support/*`
and `scripts/seed-test-users.ts`.

**Method: a static review only. The suite could not be run in this session** because the Cypress
binary download (`download.cypress.io`) is blocked by the session's network policy. CI history:
55 runs, ~10–15 min each, the last 3 on `main` green. A run of failures happened during the
club-management PR (April).

## Verdict

The suite is a reasonable **happy-path UI smoke test**: pages render, and the main create/edit/delete
flows for logs, comments, announcements, check-ins and roles work through the UI. It is **weak as a
regression safety net**:

- A noticeable set of tests **would pass even if the feature were broken** (tautologies, listed below).
- Most filter and status tests only check that the expected item *appears*, never that anything is
  *excluded* or *saved*. A filter that does nothing passes.
- The behaviors most likely to break, and where the audit found real bugs, have **no tests at all**:
  permissions and privacy, invite redemption, group membership, coach account deletion. There is not a
  single assertion on a 401/403 response anywhere in the suite.
- Config hides instability: failed tests are retried twice, and some React errors are swallowed.

So the doubt is justified. A green Cypress run today says "the main screens load and the basic forms
submit". It does not say "nothing important broke".

## 1. Tests that pass even if the feature is broken (verified by reading)

| Spec → test | Why it can't fail |
|---|---|
| `coach/manage-group` → "can send an invite — success toast or modal closes" | Passes if the page text contains `"invite"`. The page always does (the modal title is "Invite athlete"). A failed request with an error toast still passes. |
| `coach/manage-group` → "shows the group name on the athlete invite page" | Regex `/E2E Test Group\|Join/`, so the word "Join" alone satisfies it. |
| `athlete/dashboard` → Comments → "can create a comment" | `before()` already seeds a comment with the **same text** via the API, so the assertion matches the seeded one even if the UI send fails. |
| `athlete/account-settings` → "can toggle the celebration — toggle state persists" | After reload it only checks that `aria-checked` **exists**, not its value. Persistence is untested. |
| `athlete` + `coach/account-settings` → "can select the profile emoji — confirmed on dashboard" | The "confirmation" is `cy.get("nav, aside").should("exist")`, which is true on every dashboard. |
| `athlete` + `coach/account-settings` → "dashboard inaccessible after account deletion" | Clears all cookies first, so it only proves logged-out users are redirected. It would pass if deletion did nothing. |
| `coach/attendance` → "can cycle through attendance statuses" | No assertion at all. |
| `coach/attendance` → "can save attendance — session remains visible after save" | Checks that the dropdown still shows the session. It never checks that attendance was saved (no reload, no API read). |
| `coach/club` → "renders using the same shell layout" | `contains("Club")` + `main` exists. |
| `athlete/streak-schedule`, `cross-role/streak-schedule` (6 tests) | Assert `streakAfter >= streakBefore` but never that `streakBefore >= 1`. If streak calculation broke and returned 0, then 0 ≥ 0 and every one passes. |

## 2. Weak tests (positive-only or not checking persistence)

- **Filters (about 14 tests across athlete + coach dashboards):** date "Today", "pick a date",
  role, athlete, review status, and combined filters all assert only that the fixture log is visible.
  The test account is the only athlete and every fixture is created "now", so an ignored filter still
  shows the fixture. Only the athlete **tag** filter has a negative check (`should("not.contain", …)`).
- **"Reset all filters":** asserts the reset button disappears, not that the feed shows everything again.
- **Review status:** "change via dropdown" and "changes to Reviewed when opened" check the badge in
  the same render, with no reload, so an optimistic UI update with a failing API call passes.
- **Guardian calendar:** three near-identical tests (the "today" and "monthly" tests are the same
  code). All use a shared (`coach`) log; whether private logs are hidden from guardians is untested.
- **Training schedule edit:** "day picker is interactive" opens and closes a picker, then looks for
  any of `/saved|updated|applied/` on the page.

## 3. Presence-only tests

About 40 tests check that a button, label or form field renders: "shows New Announcement button",
"Role section expands to show All Roles", the six invite-page form-render tests, signup field lists,
waitlist field lists, and so on. They catch a page crashing or a renamed label. They are cheap to keep
in a smoke suite, but they don't test behavior.

## 4. Behaviors with no test

| Area | Not covered |
|---|---|
| **Permissions / privacy** | Coach cannot see an athlete's private log. Athlete cannot see another athlete's logs. Non-member cannot read a group roster. Athlete cannot use coach pages or APIs. Comments on private logs. *(No 401/403 assertion exists anywhere.)* |
| **Invites** | No test actually **redeems** an invite (athlete, coach, parent, under-13); they only render the forms. Email-mismatch rejection, expired invite, already-member. |
| **Account lifecycle** | Successful signup → email verification → login. Successful password reset. Google sign-in (can't be e2e'd; needs an API test). |
| **Groups** | Create, join by code, switch, leave, multi-group behavior. The only group test checks that "Join Another"/"Leave" buttons exist. |
| **Coach management** | Inviting an assistant coach, removing or transferring athletes, head-coach protections, the club plan (spec comment: "requires a seeded club-plan account", which doesn't exist). |
| **Account deletion** | Only a group-less **athlete** account is ever deleted (the "coach" delete test reuses the same athlete account). The coach cascade, the riskiest code in the app, is never exercised, and nothing checks what was deleted. |
| **Server rules** | The daily log cap is tested in the UI only (buttons disabled), not the server's 409. Skip-a-day is not tested. |
| **Admin** | Waitlist approval flow. |
| **Failure states** | None. The UI has no error states to test (audit E2). |

## 5. Structural problems

1. **Retries hide flakiness.** `retries: { runMode: 2 }` turns a test that fails twice and passes once
   into green. Cypress Cloud (the project records runs) will show which tests are flaky.
2. **Order-dependent tests.** "Edit" relies on "create" having run, "delete" on "edit", and "2 comments"
   on the previous test. Combined with retries, a retried later test runs against the wrong state, and
   one failure cascades.
3. **Fragile shared state.** The global `before` cleanup deletes the shared "E2E Test Group", so 9
   describe blocks re-run `pnpm seed:test` via `cy.exec` to rebuild it. That's slow, and it means
   specs depend on run order.
4. **Cleanup code that silently does nothing:**
   - `cleanupTestData` deletes `groupMemberships` by ObjectId, but the field stores strings, so it never matches.
   - `coach/dashboard` "Profile / Groups" `after()` calls `DELETE /api/groups/:id`, which doesn't exist.
     The 405 is ignored (`failOnStatusCode: false`).
   - `coach/manage-group` "Roles" cleanup reads `GET /api/groups` with no params, which returns no
     `groups` key, so it returns early every time.
5. **Swallowed errors.** `support/e2e.ts` ignores any uncaught exception whose message contains
   `"hydration"` or `"Minified React error"`, which can hide real React crashes.
6. **One athlete in the fixtures.** This is why filters can't be tested properly; there is nothing to
   filter *out*.
7. **Runs against `next dev`,** not a production build: slower, and not what users get.

## 6. Recommendation

Don't delete the suite outright, and don't trust it as it stands. Replace it in steps:

1. **Measure it (an hour, once Cypress can run):** plant 6–8 deliberate bugs one at a time and record
   which ones the suite catches:
   - date filter ignored;
   - review-status filter ignored;
   - private logs returned to coaches;
   - invite redeem returns 500;
   - attendance save is a no-op;
   - celebration toggle not saved;
   - account deletion is a no-op.

   My **prediction** from the reading above: only "private logs" has any chance of being caught, and
   only indirectly. That gives you a baseline number instead of a feeling.
2. **Delete the tautologies (§1) and the dead cleanup code (§5.4)** today. They give false confidence.
3. **Add fast API-level tests** (Vitest + a real MongoDB in CI) for permissions, privacy, invites and
   deletion: the §4 gaps. They run in seconds and keep working through the planned Postgres
   migration. Start with the audit's S1–S3 security fixes.
4. **Rewrite the E2E layer as ~8–10 independent journeys**, each creating its own data: sign up and
   verify; log → coach sees → comment round-trip; private log hidden from coach; invite → redeem →
   appears in roster; check-in → attendance saved (verified after reload); filters with a second
   athlete and an old log (negative checks); coach account deletion leaves other groups intact;
   guardian sees only shared logs.
5. **Set `retries` to 0 (or 1 with flake tracking), fix the swallowed-error filter, and run against a
   production build.** Consider Playwright for the rewritten journeys (faster, parallel, Chromium
   already available in dev containers). This is optional; Cypress is fine if you prefer it.
