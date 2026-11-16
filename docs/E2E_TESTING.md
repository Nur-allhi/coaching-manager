# E2E_TESTING — End-to-End Testing with Playwright MCP

**Status:** live · **Target skills:** `senior-frontend`, `code-reviewer` · **Tool:** `playwright-mcp`

The protocol for proving a change works, and for writing the regression suite that keeps it
working.

---

## 1. Two roles, never confused

| Role            | Tool                              | Purpose                                                                                         |
| --------------- | --------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Exploration** | Playwright MCP (`playwright-mcp`) | The agent's real browser. Verifying a ticket by hand, reproducing a bug, discovering selectors. |
| **Regression**  | `@playwright/test` specs          | The committed suite. Run from the command line and by CI.                                       |

A feature is **not** covered until a spec exists for it. MCP verification is evidence for a
PR; a spec is the guarantee.

## 2. Setup

Already in place:

- `playwright.config.ts`: `testDir: './e2e/specs'`, `baseURL` against `vite preview` on port 4173,
  Chromium and Firefox projects, `fullyParallel: true`, `retries: 0` locally and `2` in CI,
  `trace: 'on-first-retry'`.
- The MCP server is configured in `opencode.json` as `playwright`, running headless with an
  isolated profile. The MCP pins its own Chromium build, separate from `@playwright/test`'s;
  on a fresh machine run `pnpm exec playwright-mcp install-browser chrome-for-testing`.

Folder layout, introduced by ticket T-005:

```
e2e/
  specs/       the committed specs
  fixtures/    seeded data
  helpers/     shared helpers: console-error collector, viewport list, seed
  pages/       page objects, only when one is reused by two or more specs
```

No file in `e2e/` may exceed 300 LOC.

`test-results/` and `playwright-report/` are git-ignored.

## 3. Commands

| Command                     | What it does                                |
| --------------------------- | ------------------------------------------- |
| `pnpm e2e`                  | The full suite against the production build |
| `pnpm e2e -- --grep @smoke` | The smoke suite only                        |
| `pnpm e2e -- --headed`      | Watch it run                                |
| `pnpm e2e:ui`               | Playwright UI mode                          |
| `pnpm e2e:report`           | Open the last report                        |

## 4. MCP verification workflow

**Required for every ticket with UI or user-visible behaviour.**

1. **Start the app** locally, with dev or test data only.
2. **Read the page** with `browser_navigate` then `browser_snapshot`. The accessibility tree
   is the primary way to read a page, because it is also what a screen reader sees.
   `browser_take_screenshot` is for visual checks.
3. **Exercise every acceptance bullet** with `browser_click`, `browser_type`,
   `browser_fill_form`, `browser_select_option`, `browser_press_key`.
4. **Cover five paths**: the happy path, one failure or validation path, the empty state, an
   edit-then-save flow, and persistence after a page reload.
5. **Check the console** with `browser_console_messages`. Require **zero errors** and zero
   unexpected warnings. Check `browser_network_requests` and require **no unexpected
   requests** — an offline-first app makes zero external requests.
6. **Check three viewports** with `browser_resize`: `375x812`, `768x1024`, `1280x800`. Check
   keyboard-only navigation: tab order and visible focus.
7. **Record the evidence** in the PR: viewports checked, console error count, screenshot
   paths.
8. **Convert** what was verified into deterministic spec files before the ticket is done.

## 5. Spec-writing rules

1. **One behaviour per test.** The title format is `<Feature> › <behavior>`.
2. **Locator order:** `getByRole`, then `getByLabel`, then `getByText`, and `data-testid` only
   when no accessible handle exists.
3. **Web-first assertions:** `expect(locator).toBeVisible()`. Playwright's auto-waiting is
   used.
4. `waitForTimeout` and arbitrary sleeps are **forbidden**.
5. Every test is **isolated**: a fresh browser context, its own seeded data from a fixture,
   and no dependence on another test's order or results.
6. No conditionals or loops hiding assertions inside a test.
7. Time is frozen with `page.clock` when behaviour depends on a date.
8. `test.skip`, `test.fixme` and raised retries are **forbidden** as a way to hide a failure.

## 6. Coverage matrix

| Journey                   | Source             | Spec                              | Tag      |
| ------------------------- | ------------------ | --------------------------------- | -------- |
| W1 Collect a fee          | `PRD.md` §5        | `payments.spec.ts`                | `@smoke` |
| W2 Admit a student        | `PRD.md` §5        | `students.spec.ts`                | `@smoke` |
| W3 Mark attendance        | `PRD.md` §5        | `attendance.spec.ts`              | `@smoke` |
| W4 Record an exam         | `PRD.md` §5        | `marks.spec.ts`                   | `@smoke` |
| W5 Recover from a mistake | `PRD.md` §5        | `undo.spec.ts`, `restore.spec.ts` | `@smoke` |
| W6 Take the data away     | `PRD.md` §5        | `file-transfer.spec.ts`           | `@smoke` |
| Offline guarantee         | `SECURITY.md` §9   | `smoke.spec.ts`                   | `@smoke` |
| SQLite persistence        | `TICKETS.md` T-010 | `sqlite-persistence.spec.ts`      | —        |
| The whole journey         | `PLAN.md` P7-1     | `full-journey.spec.ts`            | —        |

Every UI ticket in [`TICKETS.md`](TICKETS.md) lists at least one spec in its **E2E** field.

The specs run on Chromium and Firefox. Safari/WebKit is not a supported target (D-026), so
there is no WebKit project and no skipped spec.

The smoke suite runs on every pull request into `dev`. The full suite runs before any
`dev` → `main` merge.

## 7. Unit and integration tests

The MCP and the specs cover the UI. The rules below cover everything underneath it.

1. Unit tests use Vitest with a jsdom environment, in the `src/` tree next to the code they
   test.
2. Repositories and services are tested against **`better-sqlite3`** behind the same `Db`
   interface the browser uses, so the SQL is real and the test is fast.
3. The highest-risk areas are tested first and most thoroughly, per
   `PLAN.md` §10: money, allocation, ranking, grade conversion, migrations, and backup
   validation.
4. Every repository has three template tests: a stale `expectedVersion` aborts, a soft-deleted
   row is hidden, and every write produces an audit row with the correct before and after.
5. Every migration has a test that upgrades a fixture database from each earlier version.
6. Money tests use paisa integers, never `"1000"` strings, so a rounding bug cannot hide
   behind a convenient value.
7. A test names the behaviour, not the function: `keeps the receipt number when the amount is
edited`, not `calls updatePayment`.
8. Tests are deterministic: no wall-clock time, no random data, no network.

## 8. Performance checks

| Budget                  | Target                         | How it is checked                   |
| ----------------------- | ------------------------------ | ----------------------------------- |
| Initial JavaScript      | under 300 KB gzipped           | `pnpm budget`, in CI                |
| Student list and search | under 100 ms at 5,000 students | a timed script over the seeded data |
| Any report              | under 2 s at 60,000 payments   | a timed script over the seeded data |
| First load              | under 2 s                      | measured by hand in the MCP browser |

## 9. Failure protocol

1. **Classify first.** A failure is a test defect or a product defect. Deciding which comes
   before any action.
2. **A product defect is logged in [`BUGS.md`](BUGS.md) first**, before anything else. The
   entry records `Found: YYYY-MM-DD (during: e2e <spec name>)` and puts the trace or
   screenshot path in the description.
3. The defect is **not** fixed until the human confirms the approach, per
   [`REPO_RULES.md`](REPO_RULES.md) §1 and §10.
4. **A flaky test is fixed at its cause.** Quarantining a test is a decision that needs the
   human's confirmation and a `BUGS.md` entry.
5. A bug fix includes a regression test that fails before the fix and passes after it.

## 10. Safety

1. The MCP browser touches **local development or test URLs only**. Never real credentials,
   never production data.
2. Traces, screenshots and videos that contain personal data MUST NOT be committed.
3. The database lives in the browser, so a fresh Playwright context is a fresh database. That
   is the natural reset; there is no fixture teardown.

## 11. Merge gates

| Into   | Gates                                                                      |
| ------ | -------------------------------------------------------------------------- |
| `dev`  | lint, typecheck, unit tests, and the **smoke** suite green                 |
| `main` | the **full** suite green, and zero console errors on the critical journeys |

Plus the Definition of Done in [`REPO_RULES.md`](REPO_RULES.md) §8.

## 12. Optional extras

Each is a decision and needs confirmation before it is added:

| Extra                                      | Value                                                 | Cost                                                           |
| ------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------- |
| `@axe-core/playwright` accessibility scans | Catches contrast and ARIA regressions automatically   | One dependency; a scan is not a substitute for the manual pass |
| Visual snapshot tests                      | Catches unintended visual changes                     | Brittle; needs a review workflow for the diffs                 |
| Firefox project (already enabled)          | Cross-browser coverage, which `PLAN.md` P0-2 requires | One more browser download; slower CI                           |
| Offline tests for the PWA                  | Proves the app works with the network off             | Needs a service-worker-aware harness                           |

## 13. Related documents

| Document                               | Holds                                           |
| -------------------------------------- | ----------------------------------------------- |
| [`REPO_RULES.md`](REPO_RULES.md)       | The Definition of Done and the bug protocol.    |
| [`PRD.md`](PRD.md)                     | The workflows the coverage matrix derives from. |
| [`FRONTEND_SPEC.md`](FRONTEND_SPEC.md) | The screens and states the specs assert.        |
| [`BUGS.md`](BUGS.md)                   | Where a product defect lands.                   |
