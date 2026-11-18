# Session log

An internal, developer-facing record of every AI session on this project, including
in-progress and blocked work.

This is not [`CHANGELOG.md`](CHANGELOG.md), which is the curated, human-readable subset of
completed, user- or developer-relevant changes. Nor is it
[`docs/BUGS.md`](docs/BUGS.md), which is the queue of known issues.

Format, per [`docs/REPO_RULES.md`](docs/REPO_RULES.md) §5:

```
## Session YYYY-MM-DD HH:MM

### Changes
- [file_path] — brief description of change

### Skill(s) / Tool(s) Used
- `skill-name` or `playwright-mcp`

### Status
- [completed/in-progress/blocked]
```

---

## Session 2026-11-18 13:07

### Changes

- BUG-014 (fees shown in paisa instead of taka, found in manual testing) logged FIRST in `docs/BUGS.md`
  as BUG-013, then renumbered to BUG-014 on an existing-ID collision. Bug protocol followed: logged
  before any code change, approach surfaced twice via the confirmation UI, and the human explicitly
  chose the broader whole-taka conversion over a display-only fix (recorded as D-068).
- `src/core/money/money.ts` — whole-taka convention: `formatMinor` formats the integer directly,
  `parseToMinor` rounds to the nearest taka.
- New migration `202611181200_money_whole_taka.sql` converts existing `*_minor` values by `/100`;
  registered in `src/core/db/migrations.ts`.
- `BatchSection` no longer divides the fee by 100; the two Enrollments renders now use `formatMinor`.
- Demo-data and test fixtures converted to taka; money/reports/academics/backup/migrate test
  expectations and the E2E enrollments spec updated.
- Governing docs: PLAN §3, TAD §5.3, REPO_RULES §7.4, SECURITY §5, E2E_TESTING §6, TICKETS T-014
  acceptance, DECISIONS D-068; CHANGELOG, PROGRESS and BUGS updated.
- Verification: `pnpm check` green (bundle 282.2/300 KB), 257 unit tests and 208 Playwright tests
  pass in both browsers. Firefox launcher broke mid-run (AddonManager syntax error); reinstalling
  the Playwright Firefox build fixed it.
- Earlier in this session: demo-data dev route `/__demo-fixture` added; `vite.config.ts` dev
  `allowedHosts` edit for tailnet/LAN testing. Both still uncommitted.

### Skill(s) / Tool(s) Used

- `playwright-mcp`
- `gitnexus` (earlier)
- bug protocol (`REPO_RULES` §10) and decision/confirmation UI (`REPO_RULES` §1)

### Status

in-progress — changes uncommitted on `dev`; not committed or merged yet. The BUG-014 fix,
`/__demo-fixture` route and `vite.config.ts` `allowedHosts` edit are all uncommitted.

## Session 2026-11-18 02:20

### Changes

- T-082 (audit log viewer) on branch `feature/audit-viewer`; decision D-062 recorded autonomously.
- `src/core/audit/query.ts` — additive read model with bound entity/action/date filters, parsed
  snapshots and an Admin-gated `listAuditAs`; `parseSnapshot` exported from `undo.ts`.
- `src/modules/data-tools/AuditViewerScreen.tsx` and the `/data-tools/audit` route; Backups screen
  link; en/bn `audit-viewer` namespaces.
- `src/core/audit/query.test.ts` (filters, snapshots, permission gate) and
  `e2e/specs/audit-viewer.spec.ts` (real change via `/__undo`, then listed/expanded/filtered).
- `docs/DECISIONS.md` D-062, `docs/PROGRESS.md`, `docs/BUGS.md` BUG-012/013, `CHANGELOG.md`.
- Resolved a double-trigger: the 01:00 builder was asked to stand down before T-082 began.

### Skill(s) / Tool(s) Used

- `senior-frontend`
- `senior-backend`
- `gitnexus`
- `playwright-mcp`

### Status

completed — T-082 merged into `dev` as PR #55.

## Session 2026-11-18 03:20

### Changes

- T-091 (in-app user guide) on branch `feature/user-guide`; decision D-066 recorded.
- `src/modules/guide/Screen.tsx` with EN/BN tabs, a `/guide` route and a sidebar footer link.
- `guide.en.ts` / `guide.bn.ts` wired into both aggregates; `e2e/specs/user-guide.spec.ts`
  (2 passed in Chromium and Firefox, zero external requests).
- `docs/DECISIONS.md` D-066, `docs/PROGRESS.md`, `CHANGELOG.md`.

### Skill(s) / Tool(s) Used

- `frontend-design`
- `playwright-mcp`

### Status

in-progress — T-091 is PR #59, awaiting CI and merge into `dev`.

## Session 2026-11-18 03:40

### Changes

- T-092 (production build) on branch `chore/release-preparation`; decision D-067 recorded.
- `vite.config.ts` injects the package version; Settings shows `app-version`; en/bn `settings.version`.
- README "Static hosting" section and `public/_headers` rationale.
- Version stamp verified in both browsers; clean-clone build and suite verification.
- D-067, `docs/PROGRESS.md`, `CHANGELOG.md`.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `playwright-mcp`

### Status

in-progress

## Session 2026-11-18 02:35

### Changes

- T-083 (performance pass) on branch `feature/performance-pass`; decision D-063 recorded
  autonomously (standalone `pnpm perf`, deterministic generators, measure-then-fix, budget gate).
- `scripts/seed-data.ts` — deterministic `generatePayments` / `generateMarks`.
- `scripts/perf.budget.ts` + `vitest.perf.config.ts` + `pnpm perf` — 5,000 students, 60,000
  payments, 200,000 marks, 40 exams; times real read functions and exits non-zero on a miss.
- `src/modules/payments/payments-repository.ts` — set-based `duesByStudent` (46,396 ms → 57.2 ms).
- `tsconfig.node.json` excludes the harness; `docs/DECISIONS.md` D-063, `docs/PROGRESS.md`,
  `CHANGELOG.md`, `docs/DEVELOPMENT.md`.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `gitnexus`
- `playwright-mcp`

### Status

completed — T-083 merged into `dev` as PR #56.

## Session 2026-11-18 02:50

### Changes

- T-084 (accessibility and Bangla review) on branch `feature/accessibility-review`; D-064 recorded.
- Bound implicit labels in reports/admin/leaderboard, the import button group and profile photo input.
- `e2e/specs/a11y.spec.ts` — tab order, focus ring, labels, computed AA contrast in both themes,
  360px overflow; 10 passed in each browser.
- Fixed BUG-013: import status vocabulary and leaked English tokens in Bangla strings.
- `docs/DECISIONS.md` D-064, `docs/PROGRESS.md`, `docs/BUGS.md`, `CHANGELOG.md`.
- The human Bangla-review acceptance line was left explicitly unmet (autonomous run).

### Skill(s) / Tool(s) Used

- `senior-frontend`
- `playwright-mcp`

### Status

completed — T-084 merged into `dev` as PR #57.

## Session 2026-11-18 04:30

### Changes

- T-081 (import tools with a dry run) on branch `feature/import-tools`. Decision D-061 recorded
  autonomously: pure CSV reader + lazy ExcelJS, editable column mapping, pure pre-write validation,
  forced pre-import snapshot then one audited transaction.
- `src/modules/data-tools/import/*` — parser, workbook reader, templates, validator, service and
  unit tests; `ImportScreen.tsx` and the `/data-tools/import` route.
- en/bn import keys; `e2e/specs/import.spec.ts` (bad row + no-write dry run, idempotent second import).
- `docs/DECISIONS.md` D-061, `docs/PROGRESS.md`, `CHANGELOG.md`.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `senior-frontend`
- `gitnexus`
- `playwright-mcp`

### Status

completed

---

## Session 2026-11-18 02:10

### Changes

- T-080 (PIN lock and roles) on branch `feature/pin-and-roles`. Decision D-060 recorded
  autonomously: PIN hash in localStorage (not the DB), opt-in lock, sessionStorage session that
  services trust, and an additive guarded payment write.
- `src/core/auth/*` — roles/permissions, typed errors, PBKDF2 hash/verify, PIN store, idle session
  and `assertPermission`; unit tests for the matrix, crypto, PIN store, idle lock and Teacher refusal.
- `src/app/auth/*` — lock gate, PIN lock screen, Settings security panel and the auth hook.
- `src/modules/payments/*` — `recordPaymentAs` guard, session actor in the audit row, and the real
  collect screen using the guarded entry point.
- en/bn auth keys; `e2e/specs/auth.spec.ts` (lock/unlock, UI+service denial, idle lock).
- `docs/DECISIONS.md` D-060, `docs/PROGRESS.md`, `CHANGELOG.md`.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `senior-frontend`
- `code-reviewer`
- `gitnexus`
- `playwright-mcp`

### Status

completed

---

## Session 2026-11-18 00:40

### Changes

- PR #51 (T-072 report catalogue) squash-merged into `dev` as commit `6fa78ea`; branch left in place
  per AUTONOMY.md §3.3.
- T-073 (admin report) on branch `feature/admin-report`. Decision D-059 recorded autonomously: a
  dedicated \`/reports/admin\` screen with all eight sections over one month/year range; totals from
  the owning modules' public reads; A4 print and lazy ExcelJS export.
- New `queries/admin.ts`, `admin-export.ts`, `AdminReportScreen.tsx`, `admin.css`, admin en/bn
  namespace, `/reports/admin` route, `admin-report.spec.ts` (collected asserted against the payment
  register) and 3 unit tests.
- Verification: `pnpm check` green (275.7 KB); admin E2E 6 passed; full suite 198 passed in two
  halves, 0 console errors and 0 horizontal overflow at 375px. Docs: D-059 / PROGRESS / CHANGELOG.
- This completes the ticket queue from T-062 through T-073 (six tickets plus the BUG-011 fix).

### Skill(s) / Tool(s) Used

- `gitnexus` (impact on `routeDefinitions` LOW, detect-changes)
- `senior-backend` (admin sections and totals) / `senior-frontend` (screen, print, export)
- autonomous decision protocol (REPO_RULES §1.1, AUTONOMY.md §2)

### Status

in-progress — T-073 implemented, tested and ready to commit and open a PR.

## Session 2026-11-18 00:18

### Changes

- PR #50 (T-071 reports framework) squash-merged into `dev` as commit `21b940b`; branch left in place
  per AUTONOMY.md §3.3.
- T-072 (report catalogue) on branch `feature/report-catalogue`. Decision D-058 recorded autonomously:
  the seven catalogue reports ship here, the admin report stays with its dedicated T-073; totals come
  from the owning modules' public reads. An optional total accessor was added to the framework.
- New `queries/catalogue.ts` loaders, registry definitions for all seven reports, en/bn keys, 4 new
  unit tests and an extended `reports.spec.ts`.
- Verification: `pnpm check` green (275.3 KB); reports E2E 8 passed; full suite 192 passed in two
  halves, 0 console errors. Fixed a TS error in `batchNameByStudent` types found on rebuild.
  Docs: D-058 / PROGRESS / CHANGELOG.

### Skill(s) / Tool(s) Used

- `gitnexus` (detect-changes)
- `senior-backend` (report loaders and totals)
- autonomous decision protocol (REPO_RULES §1.1, AUTONOMY.md §2)

### Status

in-progress — T-072 implemented, tested and ready to commit and open a PR.

## Session 2026-11-17 23:54

### Changes

- PR #49 (T-070 dashboard) squash-merged into `dev` as commit `a3307b0`; branch left in place per
  AUTONOMY.md §3.3.
- T-071 (reports framework) on branch `feature/reports-framework`. Decision D-057 recorded
  autonomously: a registry of report definitions with one worked report (student list), read-model
  SQL in `queries/`, and the same filtered rows feeding preview, CSV (UTF-8 BOM) and lazy ExcelJS.
- New `src/modules/reports/{queries/students,registry,export,types,Screen,reports.test}.ts(x)`, A4
  `reports.css`, reports en/bn namespace, `reports.spec.ts` (reuses the dashboard fixture).
- Verification: `pnpm check` green (276.1 KB); reports E2E 6 passed (download content asserted); full
  suite 190 passed in two halves, 0 console errors and 0 horizontal overflow at 375px. Docs:
  D-057 / PROGRESS / CHANGELOG.

### Skill(s) / Tool(s) Used

- `gitnexus` (impact on `routeDefinitions` LOW)
- `senior-frontend` (filter bar, preview, exports, print view)
- autonomous decision protocol (REPO_RULES §1.1, AUTONOMY.md §2)

### Status

in-progress — T-071 implemented, tested and ready to commit and open a PR.

## Session 2026-11-17 23:34

### Changes

- PR #48 (T-063 leaderboard) squash-merged into `dev` as commit `293424a`; branch left in place per
  AUTONOMY.md §3.3.
- T-070 (dashboard) on branch `feature/dashboard`. Decision D-056 recorded autonomously: payments
  and student KPIs come from the owning modules' public reads so they match for the same data;
  cross-module bits use the dashboard's own read-model `queries/` folder (TAD §2 #3).
- New `src/modules/dashboard/{queries/dashboard,service,types,Screen,dashboard.test}.ts(x)`, dashboard
  en/bn namespace, `/__dashboard-fixture` route + router registration, `dashboard.spec.ts`.
- `src/app/__tests__/App.test.tsx` mocks `getDb` and wraps in QueryClientProvider because the default
  route is now a real data-backed screen; the dashboard keeps its heading in every async state.
- Verification: 3 dashboard unit tests + 226 unit tests green; `pnpm check` green (274.9 KB);
  dashboard E2E 6 passed, shell/smoke/i18n/dashboard 48 passed, 0 console errors and 0 horizontal
  overflow at 375px. Docs: D-056 / PROGRESS / CHANGELOG.

### Skill(s) / Tool(s) Used

- `gitnexus` (impact on `routeDefinitions` LOW, dashboard Screen via lazy route)
- `senior-frontend` (KPI cards, links, banner, async states)
- autonomous decision protocol (REPO_RULES §1.1, AUTONOMY.md §2)

### Status

in-progress — T-070 implemented, tested and ready to commit and open a PR.

## Session 2026-11-17 23:15

### Changes

- PR #47 (T-062 grades and GPA) squash-merged into `dev` as commit `66b7d21`; branch left in place
  per AUTONOMY.md §3.3.
- T-063 (ranking and leaderboard) on branch `feature/leaderboard`. Decision D-055 recorded
  autonomously: SQL lives in the read-model `queries/` folder per TAD §2 #3, RANK() gives 1,2,2,4,
  absent is zero in totals and excluded from averages, three scopes with batch/class filters.
- New `src/modules/leaderboard/{queries/rankings,service,types,Screen,rankings.test}.ts`, A4
  `leaderboard.css`, `/__leaderboard-fixture` route + router registration, `leaderboard.spec.ts`,
  en/bn leaderboard namespace. Read-only module — no write path.
- Verification: 5 ranking unit tests; `pnpm check` green (274.5 KB); full E2E suite 178 passed in
  two halves with 1 worker (leaderboard 6 passed), 0 console errors and 0 horizontal overflow at
  375px on the new screen. Docs: D-055 / PROGRESS / CHANGELOG.

### Skill(s) / Tool(s) Used

- `gitnexus` (impact on `routeDefinitions` LOW, leaderboard Screen via lazy route)
- `senior-frontend` / `senior-backend` (screen + ranking query)
- autonomous decision protocol (REPO_RULES §1.1, AUTONOMY.md §2)

### Status

in-progress — T-063 implemented, tested and ready to commit and open a PR.

## Session 2026-11-17 22:55

### Changes

- PR #46 (BUG-011 missing-exam fix) squash-merged into `dev` as commit `01cb059` after both CI jobs
  went green; branch left in place per AUTONOMY.md §3.3 (branch deletion is human-only overnight).
- T-062 (grades and GPA) on branch `feature/grades-gpa`. Decision D-054 recorded autonomously: the
  grade/points display is in scope per PLAN §8 / FRONTEND_SPEC §5.6 despite the ticket's "E2E: n/a"
  line; no new E2E spec, the existing `marks.spec.ts` was extended.
- New `src/modules/exams/grades.ts` — pure `gradeFor` (inclusive TAD §5.7 bands) and `gpaFor` (mean
  grade points, ungraded excluded). `MarksGrid.tsx` reads the live Settings scale through the public
  `getSetting` and shows grade letter + points beside each student plus a batch GPA, all updating
  with the optimistic marks. Additive `GradingScale`/`Grade` type re-export from settings, en/bn keys.
- Verification: 5 new grade unit tests (incl. a persisted-scale edit changing 80 from A+ to A);
  `pnpm check` green (273.4 KB); `marks.spec.ts` 10 passed in Chromium + Firefox with 0 horizontal
  overflow at 375px. GitNexus impact: `getSetting` LOW (read-only), MarksGrid via lazy route
  (text-confirmed). Docs: PROGRESS/CHANGELOG/D-054.

### Skill(s) / Tool(s) Used

- `gitnexus` (impact + detect-changes)
- `senior-backend` / `senior-frontend` (grade logic + grid columns)
- autonomous decision protocol (REPO_RULES §1.1, AUTONOMY.md §2)

### Status

in-progress — T-062 implemented, tested and ready to commit and open a PR.

## Session 2026-11-17 22:45

### Changes

- BUG-011 (missing `/exams/:id` logs "Query data cannot be undefined", blank grid) logged FIRST in
  `docs/BUGS.md` with the next id, before any code was touched. Decision D-053 recorded the fix
  autonomously under AUTONOMY.md §2 (REPO_RULES §1.1 options + leans taken): typed `ExamNotFoundError` +
  `loadExam` in `src/modules/exams/service.ts`; `MarksGrid` query function uses it with
  `retry: false` / `throwOnError` for unexpected errors, and renders loading / not-found + retry
  states; new en/bn `exams.notFound` and `exams.retry` keys.
- Regression coverage: `src/modules/exams/MarksGrid.test.tsx` (component test asserts the not-found
  alert and zero undefined-data console errors — confirmed FAILING on the pre-fix screen, PASSING
  after), a `loadExam` service unit test, and a `marks.spec.ts` E2E case for the real route.
- GitNexus index refreshed; impact on `service.ts:getExam` LOW, single caller (the marks-grid route).
- Docs: BUGS.md BUG-011 moved to Fixed, CHANGELOG Fixed entry, PROGRESS entry, D-053; housekeeping
  for the fix branch.

### Skill(s) / Tool(s) Used

- `gitnexus` (impact + index refresh)
- `code-reviewer` / `bug-tracker` / `session-logger` protocols (REPO_RULES §10, §5)
- autonomous decision protocol (REPO_RULES §1.1, AUTONOMY.md §2)

### Status

in-progress — BUG-011 fix implemented, tested (`pnpm check` green, marks E2E 8/8) and ready to commit
and open a PR; T-062 not started yet.

## Session 2026-11-17 22:00

### Changes

- PR #44 (T-061 exam + marks grid) squash-merged into `dev` as commit `c1b1a0d` after both CI
  jobs confirmed SUCCESS and the user explicitly confirmed; branch `feature/marks-grid` deleted.
- BUG-010 (duplicate create audit rows on attendance session open) fixed on branch
  `fix/duplicate-session-audit` after the human confirmed the approach (remove the redundant
  manual audit). Regression test added FIRST and confirmed failing before the fix (asserts
  exactly one create audit row for the session); then the manual `writeAudit` call and unused
  import removed from `src/modules/attendance/repository.ts`.
- Docs: `docs/BUGS.md` status fixed (moved to Fixed section with approach/resolved),
  `CHANGELOG.md` Fixed entry, `docs/PROGRESS.md` T-061 note updated.
- Verification so far: 6 attendance unit tests pass; full `pnpm check` + E2E + GitNexus
  detect-changes pending.

### Skill(s) / Tool(s) Used

- `code-reviewer` (audit helper review)
- `gitnexus` (impact on `getOrCreateSession` LOW, 2 direct callers)
- `playwright-mcp` (earlier)
- bug protocol `REPO_RULES` §10

### Status

in-progress — BUG-010 fix implemented and unit-tested but not committed or merged yet.

## Session 2026-11-17 21:47

### Changes

- PR #43 (T-060 attendance session and grid) squash-merged into `dev` as commit `8577df9` after
  both CI jobs confirmed SUCCESS and the user explicitly confirmed; branch `feature/attendance-grid`
  deleted locally and remotely.
- T-061 (exam + marks grid) on branch `feature/marks-grid`:
  `src/modules/exams/{repository,service,types}.ts` — tx-held exam uniqueness guard, audited
  junction writes, grid cells via public module surfaces, live average excluding absent/unmarked
  per TAD §5.7.
- `src/modules/exams/Screen.tsx` — create form + exam list; `MarksGrid.tsx` — roving-tabindex ARIA
  grid with a number input per cell, absent toggle showing "A", no-op write guard; `/exams/:id`
  route.
- `src/modules/academics/index.ts` — additive `listSubjects` public read export; `/__marks-fixture`
  test route; `e2e/specs/marks.spec.ts` (3 tests); 6 service unit tests; en/bn exams i18n
  namespaces; D-052 decision, PROGRESS/CHANGELOG/BUGS updates.
- `docs/BUGS.md` — BUG-010 (duplicate audit rows on attendance session creation) logged, NOT fixed
  (fix approach awaiting human confirmation per bug protocol).
- Note — a lint rule (setState in effect) forced a refactor to sparse draft overrides.
- Note — a blur-triggered duplicate write caused one flaky reload E2E until a no-op write guard
  was added.
- Verification: `pnpm check` green (bundle 273/300 KB), 168 E2E passed (45 + 123), browser
  verification of the real create form, uniqueness duplicate toast, 375px no-overflow, 0 console
  errors.

### Skill(s) / Tool(s) Used

- `senior-frontend`
- `decision-advisor`
- `gitnexus` (reindex + impact)
- `playwright-mcp`
- code review of audit helper (`code-reviewer`)

### Status

in-progress — PR #43 (T-060) merged into `dev`; T-061 implemented on branch `feature/marks-grid`,
not committed or merged yet. BUG-010 logged, not fixed.

## Session 2026-11-17 21:11

### Changes

- `src/modules/attendance/{repository,service,types}.ts` — session/record SQL, `getOrCreateSession` via UNIQUE, one-action mark-all in one audited tx, roster from public module surfaces, percentage summary with absent=0 (T-060, first P4 ticket).
- `src/modules/attendance/Screen.tsx` — session picker.
- `src/modules/attendance/AttendanceGrid.tsx` — roving-tabindex ARIA grid with a save-state indicator.
- Route registered in the module manifest; `/__attendance-fixture` test route added.
- `e2e/specs/attendance.spec.ts` (4 tests), 5 service unit tests, en/bn attendance i18n namespace files.
- `docs/DECISIONS.md` (D-051), `docs/PROGRESS.md`, `CHANGELOG.md` updated. Branch `feature/attendance-grid`; all E2E pass (123 in second half).
- Note — nested-tx guard caught a real bug: `insert()` opens its own tx, so `repoWithin` must be used inside an outer tx.
- Note — a stale preview build caused one false E2E failure until rebuilt.

### Skill(s) / Tool(s) Used

- `senior-frontend`
- `decision-advisor`
- `branch-manager`
- `gitnexus`
- `playwright-mcp`

### Status

in-progress — T-060 implemented on branch `feature/attendance-grid`; not committed or merged yet.

## Session 2026-11-17 19:49

### Changes

- `vite.config.ts` — added `wasm` to the Workbox precache glob so the SQLite WASM binary is
  available offline; startup migration runs before render, so without it the app showed the
  recovery screen offline (BUG-004).
- `src/modules/settings/SettingsScreen.tsx` — restored `data-testid="persistence-status"` on the
  persistence paragraph that T-040 removed (BUG-005).
- `e2e/specs/offline.spec.ts` — both offline tests now pass; `pnpm check` green; 16 E2E pass
  across the offline/settings/payments specs.
- `docs/BUGS.md` — BUG-004 and BUG-005 marked fixed; `CHANGELOG.md` updated.
- Branch `fix/offline-specs`.

### Skill(s) / Tool(s) Used

- `senior-frontend`
- `playwright-mcp`
- `gitnexus`

### Status

in-progress — BUG-004 and BUG-005 fixed and verified on branch `fix/offline-specs`; not committed
or merged yet.

## Session 2026-11-17 19:45

### Changes

- `src/modules/payments/payments-repository.ts` — one `duesByStudent` aggregation (charge net minus valid allocations, `HAVING > 0`) and `listPaymentsForStudent` (T-053, D-049).
- `src/modules/payments/dues-service.ts` — `duesReport` enriches totals through the students/academics/enrollments public APIs and `studentPaymentHistory` feeds the profile tab; additive `listClasses` export in academics.
- `src/modules/payments/DuesScreen.tsx` — real `/payments/dues` screen with batch/class/amount filters, filtered total and virtualized rows.
- `src/modules/payments/StudentPaymentsTab.tsx` — exported from payments and rendered by `StudentProfile` for the Payments tab; no cross-module table reads.
- `/__dues-fixture` test route, en/bn keys, 3 unit tests, 4 E2E tests, D-049, PROGRESS and CHANGELOG updated.
- Browser verification: `/payments/dues` checked at 375x812, 768x1024 and 1280x800 — 0px horizontal
  document overflow and 0 console errors at each; screenshots `/tmp/opencode/dues-375.png`,
  `/tmp/opencode/dues-768.png`, `/tmp/opencode/dues-1280.png`.
- BUG-009 (dues grid overflow at 375/768px) was found during that verification, logged first, then
  fixed with shrinkable grid columns and a 375px regression assertion in `dues.spec.ts`.
- Worked in an isolated worktree because the main checkout is shared with a busy interactive session.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `senior-frontend`
- `gitnexus`
- `code-reviewer`
- `security-auditor`
- `playwright-mcp`

### Status

- completed

## Session 2026-11-17 19:17

### Changes

- `src/modules/payments/payment-service.ts` — `editPayment` re-runs allocation in one transaction, keeps the receipt number and bumps `revision`; `voidPayment` wraps core `voidRecord`; the allocation loop was extracted once and reused (T-052, D-048).
- `src/modules/payments/payments-repository.ts` — additive `deleteAllocations` (audited) and `updatePayment` via `repoWithin`; no change to the HIGH-risk `insertAllocation`/`openCharges` signatures.
- `src/modules/payments/RecentPayments.tsx` — real recent-payments list with Edit/Void, REVISED/VOID i18n markers and a receipt preview showing the revision count.
- `PaymentsScreen.tsx` renders the new section and invalidates the recorded-payments query after a collect; en/bn keys added.
- 7 new unit tests and 2 new `payments.spec.ts` E2E tests; D-048, PROGRESS and CHANGELOG updated.
- Worked in an isolated worktree (`ccm-wt-t052`) because the main checkout was shared with a busy interactive session; the main checkout was restored clean.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `senior-frontend`
- `gitnexus`
- `code-reviewer`
- `security-auditor`
- `playwright-mcp`

### Status

- completed

## Session 2026-11-17 18:02

### Changes

- `src/modules/payments/{payments-repository,payment-service}.ts` — gapless receipt numbers,
  bounded oldest-first allocation, advance reuse and dues preview (T-051, D-047).
- T-050's charge generator applies advances; additive public exports in payments/index.ts.
- `src/modules/payments/PaymentsScreen.tsx`, `/__payment-fixture`, `e2e/specs/payments.spec.ts`,
  `payment-service.test.ts`, en/bn keys, D-047, PROGRESS, CHANGELOG.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `senior-frontend`
- `gitnexus`
- `code-reviewer`
- `security-auditor`

### Status

completed

---

## Session 2026-11-17 17:38

### Changes

- `src/modules/payments/migrations/202611171020_payments_charge_uniqueness.sql` + registry and
  schema-version test constants — a unique key that also covers NULL-month charges (T-050, D-046).
- `src/modules/payments/{repository,service}.ts` — idempotent charge generation with integer-paisa
  fixed/percent discounts; additive `listActive` export in enrollments.
- `src/modules/payments/service.test.ts`, `docs/DECISIONS.md` D-046, PROGRESS, CHANGELOG.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `gitnexus`
- `code-reviewer`
- `security-auditor`

### Status

completed

---

## Session 2026-11-17 17:18

### Changes

- `scripts/seed-data.ts`, `scripts/seed.ts`, `package.json` — pure deterministic generator and
  `pnpm seed --students N [--seed S] [--out FILE]` CLI (T-044, D-045).
- `src/test/seed-data.test.ts`, the students 5,000-row benchmark and `e2e/specs/seed.spec.ts` —
  both suites consume the shared generator; `/__seed-fixture` seeds the browser database.
- `docs/DEVELOPMENT.md`, `docs/DECISIONS.md` D-045, PROGRESS, CHANGELOG.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `gitnexus`
- `playwright-mcp` (unavailable; Playwright CLI used instead)

### Status

completed

---

## Session 2026-11-17 16:48

### Changes

- `src/modules/enrollments/{types,repository,service}.ts` — audited enrollment CRUD, atomic
  transfer, discounts, leave date and capacity warning (T-043, D-044).
- `src/modules/enrollments/{EnrollmentsScreen,Screen}.tsx` — the real lazy `/enrollments` screen.
- `src/modules/academics/index.ts`, `src/modules/students/index.ts` — additive public read exports
  so enrollments reads batch/student data through module boundaries (TAD.md §2).
- `src/app/dev/EnrollmentFixture.tsx`, `src/app/router.ts` — test-only fixture route for E2E.
- `e2e/specs/enrollments.spec.ts`, en/bn i18n, `docs/DECISIONS.md` D-044, PROGRESS, CHANGELOG.
- `docs/BUGS.md` — BUG-008 (dev harness routes reachable in production; deferred under D-025).

### Skill(s) / Tool(s) Used

- `senior-backend`
- `senior-frontend`
- `gitnexus`
- `playwright-mcp` (unavailable; Playwright CLI used instead)

### Status

completed

---

## Session 2026-11-17 16:12

### Changes

- `src/modules/students/migrations/202611171000_students_search_photo.sql` — append-only FTS5
  index with sync triggers and a bounded photo BLOB (T-042, D-043).
- `src/core/db/split-sql.ts` + test — preserve trigger bodies as one statement; the new schema
  version also required update to the backup/snapshot/migrate test constants.
- `src/modules/students/{types,repository,service,photo}.ts` — Zod boundaries, audited CRUD and
  restore, in-transaction per-year number allocation, bounded JPEG photos, FTS5 search.
- `src/modules/students/{StudentsScreen,AdmissionScreen,StudentProfile,StudentFormFields,Screen}.tsx`
  — the real lazy student routes: search/filters, virtualized list, admission form and the
  six-tab profile shell.
- `e2e/specs/students.spec.ts`, en/bn i18n, `docs/DECISIONS.md` D-043, `docs/PROGRESS.md`,
  `CHANGELOG.md`.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `senior-frontend`
- `gitnexus`
- `code-reviewer`
- `security-auditor`
- `playwright-mcp` (unavailable; Playwright CLI used instead)

### Status

completed

---

## Session 2026-11-17 15:27

### Changes

- `src/modules/academics/types.ts`, `repository.ts`, `service.ts` — forms, audited CRUD and the
  two warning rules for academic years, classes, subjects and batches (T-041, D-042).
- `src/modules/academics/AcademicsScreen.tsx`, `BatchSection.tsx`, `SimpleCrudSection.tsx`,
  `Screen.tsx` — the real lazy `/academics` screen replaces the placeholder; four CRUD sections,
  a live clash/capacity warning preview, optimistic writes and a committed-save status.
- `e2e/specs/academics.spec.ts` — CRUD persistence, edit/soft delete and the non-blocking clash
  warning.
- `src/core/i18n/locales/en.ts`, `bn.ts` — academic keys in both languages.
- `docs/DECISIONS.md` — D-042, the autonomous T-041 decision (A1/B1/C1/D1/E1).
- `docs/BUGS.md` — BUG-004 (WASM missing from the PWA precache) and BUG-005 (stale
  `persistence-status` test id), both pre-existing on `dev`, logged while verifying T-041.
- `docs/PROGRESS.md`, `CHANGELOG.md` — T-041 recorded.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `senior-frontend`
- `gitnexus`
- `code-reviewer`
- `security-auditor`
- `playwright-mcp` (unavailable; Playwright CLI used instead)

### Status

completed

---

## Session 2026-11-17 13:50

### Changes

- `src/modules/settings/defaults.ts`, `src/modules/settings/repository.ts` — Zod-validated typed
  settings over the settings table with audited writes (T-040, first P2 ticket).
- `src/modules/settings/SettingsScreen.tsx` — centre profile, currency, receipt format, fixed
  7-row grading scale with TAD defaults, language toggle, backup/storage status.
- `src/app/bootstrap.ts`, `src/app/RecoveryScreen.tsx` — startup migration with a real
  pre-migration snapshot (skipped on first install) and a recovery screen; closes a PLAN §7.4 gap.
- `en`/`bn` i18n keys added; six repository unit tests; `e2e/specs/settings.spec.ts` (3 tests).
- `docs/DECISIONS.md` (D-041), `docs/PROGRESS.md`, `CHANGELOG.md` — documentation updates.
- Branch `feature/settings-module`. All E2E green across both halves. No BUG ids touched.

### Skill(s) / Tool(s) Used

- `senior-backend`, `senior-frontend`
- `decision-advisor`, `branch-manager`
- `gitnexus`
- `playwright-mcp`

### Status

in-progress — T-040 implemented on branch `feature/settings-module`; not committed or merged yet.

## Session 2026-11-17 13:15

### Changes

- `src/modules/data-tools/BackupsScreen.tsx` — real Backups page (T-035): snapshot list with
  reason/size/date, restore, export and a 7-day stale-export banner.
- `src/core/ui/use-optimistic-mutation.ts` — shared `useOptimisticMutation` helper on TanStack
  Query; `QueryClientProvider` wired up in `src/main.tsx`.
- `src/core/backup/health.ts` — backup health helper storing the last export timestamp in
  `app_meta`.
- `en`/`bn` i18n keys added; `/__backup-fixture` test route added for browser verification.
- `e2e/specs/backups.spec.ts` — three specs; four health unit tests.
- `e2e/specs/shell.spec.ts` — Data tools route heading is now 'Backups' (real page); spec uses
  an optional `heading` field.
- `docs/DECISIONS.md` (D-040), `docs/PROGRESS.md`, `CHANGELOG.md` — documentation updates.
- Branch `feature/backups-page`, the last P1 ticket. All E2E green in the browser. No BUG ids
  touched.

### Skill(s) / Tool(s) Used

- `senior-frontend`
- `decision-advisor`, `branch-manager`
- `gitnexus`
- `playwright-mcp`

### Status

in-progress — T-035 implemented on branch `feature/backups-page`; not committed or merged yet.

## Session 2026-11-17 12:30

### Changes

- `src/core/ui/undo-toast.ts` — 10-second sonner undo toast (T-034).
- `src/core/ui/HistoryPanel.tsx` — generic `{table, recordId}` audit-history panel.
- `src/core/audit/write.ts` — `makeAuditContext()` factory for audit writes.
- `RootLayout` / app shell — `Toaster` mounted; `en`/`bn` i18n keys added.
- `/__undo` dev harness — browser verification of the toast and history UI.
- `e2e/specs/undo.spec.ts` — four specs (create/update/delete/history-restore).
- `docs/DECISIONS.md` (D-039), `docs/PROGRESS.md`, `CHANGELOG.md` — documentation updates.
- Branch `feature/undo-history`. Core `undo()`/`listHistory()` already existed from T-030. All E2E
  green in chromium and firefox; a single full run hit time/memory limits, so the suite was split
  into two halves with 1 worker — all passed.

### Skill(s) / Tool(s) Used

- `senior-frontend`
- `decision-advisor`, `branch-manager`
- `gitnexus`
- `playwright-mcp`

### Status

in-progress — T-034 implemented on branch `feature/undo-history`; not committed or merged yet. `tsc`
intermittently segfaults under memory pressure; worked around with `NODE_OPTIONS` max-old-space-size.

## Session 2026-11-17 11:15

### Changes

- `src/core/backup/crypto.ts`, `src/core/backup/crypto-types.ts` — self-describing AES-GCM
  container with PBKDF2-SHA-256 600k and injected WebCrypto (T-033).
- `src/core/backup/file-transfer.ts` — export/import reusing T-032 restore via a new
  `importAsSnapshot` helper in `snapshots.ts`.
- `src/app/dev/FileTransferHarness.tsx`, `/__file-transfer` route — browser verification harness.
- `e2e/specs/file-transfer.spec.ts` — three specs; nine unit tests (crypto + file-transfer).
- `docs/DECISIONS.md` (D-038), `docs/PROGRESS.md`, `CHANGELOG.md` — documentation updates.
- Branch `feature/database-file-transfer`. All 3 E2E pass including a real-browser AES-GCM round
  trip; `pnpm check` green, `pnpm e2e` 86 passed. Note: `showSaveFilePicker`/download writer
  implemented; product UI invocation deferred to T-035.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `decision-advisor`, `branch-manager`
- `gitnexus`
- `playwright-mcp`

### Status

in-progress — T-033 implemented on branch `feature/database-file-transfer`; not committed or
merged yet.

## Session 2026-11-17 00:59

### Changes

- `src/app/dev/SnapshotHarness.tsx` — added Tailwind `wrap-anywhere` to the sidecar `<p>` so the
  JSON string wraps at phone width (BUG-003 fix).
- `e2e/specs/snapshots.spec.ts` — regression spec: takes a snapshot at 375px, asserts zero
  document overflow.
- `docs/BUGS.md` — BUG-003 marked fixed with root cause.
- `CHANGELOG.md` — Fixed entry added.
- Branch `fix/bug-003-harness-overflow`. Regression test failed before the fix (1075px overflow)
  and passed after (0); `pnpm check` green, `pnpm e2e` 80 passed.

### Skill(s) / Tool(s) Used

- `senior-frontend`
- `gitnexus`
- `playwright`

### Status

in-progress — BUG-003 fixed and verified on branch `fix/bug-003-harness-overflow`; not committed
or merged yet.

## Session 2026-11-17 00:41

### Changes

- `src/app/single-tab.ts` — Web Locks owner acquisition with dev bypass (T-018, single-tab lock).
- `src/app/LockScreen.tsx` — bilingual lock screen shown to non-owner tabs.
- `en`/`bn` locale files — lock screen strings.
- `src/main.tsx` — top-level await to acquire the tab lock before render.
- `src/app/__tests__/single-tab.test.ts` — four unit tests.
- `e2e/specs/single-tab.spec.ts` — three E2E specs.
- `docs/DECISIONS.md` (D-037), `docs/PROGRESS.md`, `CHANGELOG.md` — documentation updates.
- Branch `feature/single-tab-lock` for T-018. E2E spec was written by the primary agent: an
  `e2e-tester` subagent flagged a prompt injection in its tool output and did not write its file.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `decision-advisor`, `branch-manager` (subagent roles)
- `gitnexus`, `playwright`

### Status

in-progress — T-018 implemented on branch `feature/single-tab-lock`; not committed or merged yet.

## Session 2026-11-16 23:55

### Changes

- `src/core/backup/restore.ts` — validate, summarise, forced pre-restore snapshot, import, and
  re-import of live bytes on failure (D-036).
- `src/core/backup/snapshots.ts` — additive `force` option for explicit safety copies.
- `src/app/dev/SnapshotHarness.tsx` — break-data and restore controls plus data count.
- `src/core/backup/restore.test.ts` — five tests; `e2e/specs/restore.spec.ts` — one spec.
- `docs/DECISIONS.md` — D-036 autonomous decision; `CHANGELOG.md`, `docs/PROGRESS.md`.
- Branch `feature/restore`, from `dev` after T-031 merged as `b1921a9`.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `decision-advisor`, `branch-manager`, `e2e-tester`, `code-reviewer`, `security-auditor`,
  `commit-writer`, `session-logger` (subagent roles)
- `gitnexus`, `playwright`

### Status

in-progress — T-032 implemented; `pnpm check` green, 108 unit tests and 72 e2e passed; reviews,
commit and PR pending. The first restore e2e run used a stale `dist`; rebuilding fixed it. BUG-003
(dev harness overflow) and BUG-001/002 remain open and untouched.

## Session 2026-11-16 23:34

### Changes

- `src/core/backup/storage.ts` — `SnapshotStorage` seam and OPFS adapter (D-035 A1).
- `src/core/backup/snapshots.ts` — create/list, WebCrypto checksum dedupe, time-sortable names,
  unique suffixes and rotation to 10 with sidecar cleanup.
- `src/app/dev/SnapshotHarness.tsx`, `src/app/router.ts` — `/__snapshots` verification route.
- `src/core/backup/snapshots.test.ts` — four unit tests; `e2e/specs/snapshots.spec.ts` — two specs.
- `docs/DECISIONS.md` — D-035 autonomous decision; `CHANGELOG.md`, `docs/PROGRESS.md`.
- Branch `feature/snapshots`, from `dev` after T-030 merged as `729ee89`.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `decision-advisor`, `branch-manager`, `e2e-tester`, `code-reviewer`, `security-auditor`,
  `commit-writer`, `session-logger` (subagent roles)
- `gitnexus`, `playwright`

### Status

in-progress — T-031 implemented and committed; rebased onto dev after T-020 merged. Final
verification: `pnpm check` green (103 unit tests, 160.7 KB), `pnpm e2e` 70 passed, format check
green; reviews and PR pending. Two `pnpm check` attempts hit transient Vitest worker failures
(timeout, then SIGSEGV) while another nightly session ran concurrently; both passed on retry and
are logged as flaky infrastructure. BUG-003 opened for the dev harness's 375px overflow.
The original pre-merge run of T-031 was green with 96 unit tests and 59 e2e tests, at which point
T-020 was still the other session's open PR #22.

## Session 2026-11-16 23:18

### Changes

- `src/core/audit/undo.ts` — review fix: undoing a `restore` now soft-deletes instead of trying to
  restore an already-live row; `StoredAction` aliases `AuditAction`; table/version guards reused
  from the repository.
- `src/core/audit/undo.test.ts` — regression test for undo of a restore (now ten tests).
- `src/core/db/void-restore.ts` — removed the unused exported `restoreRecord` wrapper.
- `src/core/db/repository.ts` — exported the existing `tableName` / `assertVersion` guards.
- `docs/PROGRESS.md`, `session_log.md` — refreshed test counts and recorded this fix cycle.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `code-reviewer` (FAIL then fixes), `security-auditor` (PASS), `gitnexus`

### Status

in-progress — review fixes verified (`pnpm check` green, 92 unit tests, 55 e2e); one Vitest
worker-termination timeout occurred under concurrent load and passed on retry (flaky infra, no
bug logged). Final re-review, commit and PR pending.

## Session 2026-11-16 23:11

### Changes

- `src/core/db/void-restore.ts` — void and restore write helpers (D-034 A1); `payments` is the
  only voidable table.
- `src/core/audit/undo.ts` — undo of create/update/delete/void/restore through audited helpers
  in one transaction, plus `listHistory` (D-034 B1/D1).
- `src/core/audit/write.ts` — `restore` added to the audit action union; no behaviour change.
- `src/core/audit/undo.test.ts` — ten tests including undo-of-restore and rollback atomicity.
- `docs/DECISIONS.md` — D-034 autonomous decision; `CHANGELOG.md`, `docs/PROGRESS.md`.
- Branch `feature/audit-writer`, from `dev` after T-019 merged as `45b86bc`.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `decision-advisor`, `branch-manager`, `e2e-tester`, `code-reviewer`, `security-auditor`,
  `commit-writer`, `session-logger` (subagent roles)
- `gitnexus`

### Status

in-progress — T-030 implemented; `pnpm check` green, 92 unit tests and 55 e2e passed; reviews,
commit and PR pending. T-020 was already in progress in the concurrent worktree
`ccm-t020-i18n`, so this run skipped it and took the next free ticket.

## Session 2026-11-16 23:07

### Changes

- `docs/DECISIONS.md` — added D-033 (autonomous T-020 i18n decisions).
- `src/core/i18n/{index.ts,locales/en.ts,locales/bn.ts,numbers.ts,useBanglaDigits.ts,LanguageControls.ts}` — added i18next scaffold, typed EN/BN resources, Intl-based digit setting and sidebar controls.
- `src/app/{AppShell.tsx,ModulePlaceholder.tsx,ErrorBoundary.tsx,router-layout.tsx,module-contract.ts}` — moved all user-visible strings to i18n keys.
- `src/modules/*/index.ts` and `Screen.tsx` (11 modules) — labelKey/titleKey instead of English display strings.
- `src/test/setup.ts`, `src/app/registry.test.ts` — pin English for tests, assert keys.
- `e2e/specs/i18n.spec.ts` — new 5-test spec; `e2e/helpers/locale.ts` — locale pin helper.
- `e2e/specs/{shell,smoke,error-boundary}.spec.ts` — pin English before app boot.
- `CHANGELOG.md`, `docs/PROGRESS.md` — housekeeping for T-020.
- Note — session moved to an isolated worktree because a concurrent nightly session (started 22:47) is implementing T-019 in the shared checkout; T-019 left to that session. No BUG ids touched.

### Skill(s) / Tool(s) Used

- `decision-advisor`
- `e2e-tester`
- `playwright-mcp` (agent role)
- GitNexus CLI
- pnpm
- Playwright

### Status

in-progress — branch implemented and verified with checks green; PR not yet open and no merge has happened.

## Session 2026-11-16 22:57

### Changes

- `src/app/persistent-storage.ts` — first-run `navigator.storage.persist()` request, guarded by a
  localStorage flag and an in-flight promise; read-only status helper (D-032, A1).
- `src/main.tsx` — requests persistence before mount; `src/modules/settings/Screen.tsx` — shows
  the live status in Settings (D-032, B1).
- `vite.config.ts` — Workbox `skipWaiting` / `clientsClaim` so the first visit is controlled by
  the service worker; the manifest and icons were already present.
- `e2e/specs/offline.spec.ts` — offline reload, installability and status specs;
  `src/app/persistent-storage.test.ts` — six unit tests including a refused-request case.
- `docs/DECISIONS.md` — D-032 autonomous decision for T-019; `docs/BUGS.md` — BUG-001 (pre-existing
  stray conflict marker in the decisions log, logged and left for the human).
- `CHANGELOG.md`, `docs/PROGRESS.md` — housekeeping for T-019.
- Branch `feature/pwa-persistence`, from `dev`.

### Skill(s) / Tool(s) Used

- `senior-frontend`
- `decision-advisor`, `branch-manager`, `e2e-tester`, `code-reviewer`, `security-auditor`,
  `commit-writer`, `bug-tracker`, `session-logger` (subagent roles)
- `gitnexus`
- `playwright` (browser verification: 375/768/1280 px, 0 console errors, 0 external requests)

### Status

in-progress — T-019 implemented and verified (pnpm check green, 55 e2e passed); security review
PASS, code review re-run pending; commit and PR to `dev` pending. BUG-001 logged, not fixed.

## Session 2026-11-16 22:27

### Changes

- `docs/AUTONOMY.md` — added: autonomous overnight build mode (decide-and-record, retries,
  auto-merge to dev after green CI and passing reviews; main, releases and locked decisions
  stay human-only).
- `docs/REPO_RULES.md` (§1/§10), `AGENTS.md`, `CLAUDE.md` — linked AUTONOMY.md as the exception
  to the confirmation protocol and bug protocol.
- `docs/DECISIONS.md` — added D-031.
- `CHANGELOG.md`, `docs/PROGRESS.md` — housekeeping updates.
- GitHub — enabled auto-merge on `dev`.
- OpenChamber — created scheduled task 'Coaching Manager — autonomous nightly build' (daily
  22:00 Asia/Dhaka, goal mode 400k tokens, fresh worktree from `dev`).
- Branch `docs/autonomous-mode`.

### Skill(s) / Tool(s) Used

- `gitnexus`
- `code-reviewer`
- `senior-backend` (or `opencode`)

### Status

in-progress — on branch `docs/autonomous-mode`; docs not committed or merged yet.

## Session 2026-11-16 21:34

### Changes

- `.opencode/agents/branch-manager.md`, `.opencode/agents/code-reviewer.md`,
  `.opencode/agents/commit-writer.md`, `.opencode/agents/e2e-tester.md`,
  `.opencode/agents/release-manager.md`, `.opencode/agents/security-auditor.md` — six subagent
  files: reviewed and relaxed permissions per human decision D-030 (option 3, maximum). In-scope
  ask rules converted to allow, missing GitNexus/pnpm budget/dev-server permissions added, bodies
  updated to act without asking, and hard gates kept (no merge, no force push, no push to
  main/dev, no branch delete).
- `docs/DECISIONS.md` — added D-030.

### Skill(s) / Tool(s) Used

- `gitnexus`
- `senior-backend` (or `opencode`)
- `code-reviewer`

### Status

in-progress — on branch `chore/subagent-permissions`; not committed or merged yet. T-017 work is
stashed on `feature/error-boundary`.

## Session 2026-11-16 21:55

### Changes

- `src/app/router.ts`, `src/app/router-layout.tsx` — T-017: data router migration.
- `src/app/ErrorBoundary.tsx` — global ErrorBoundary with a recoverable screen.
- `src/core/ui/form-drafts.ts`, `src/core/ui/use-draft-form.ts` — sessionStorage draft persistence.
- `src/app/useNavigationGuard.ts` — unsaved-changes guard.
- dev `CrashProbe` route — development-only crash trigger for verification.
- `e2e/specs/error-boundary.spec.ts` — 5 e2e specs for the error boundary.
- `docs/DECISIONS.md` (D-029), `docs/PROGRESS.md`, `CHANGELOG.md` — decision record and
  housekeeping updates. Work is on branch `feature/error-boundary`.

### Skill(s) / Tool(s) Used

- `senior-frontend`
- `decision-advisor`
- `branch-manager`
- `e2e-tester`
- `gitnexus`
- `playwright-mcp`

### Status

in-progress — T-017 implemented locally on branch `feature/error-boundary`; not committed or
merged yet.

## Session 2026-11-16 20:37

### Changes

- `.opencode/agents/branch-manager.md`, `.opencode/agents/commit-writer.md`,
  `.opencode/agents/code-reviewer.md`, `.opencode/agents/security-auditor.md`,
  `.opencode/agents/release-manager.md`, `.opencode/agents/e2e-tester.md`,
  `.opencode/agents/bug-tracker.md`, `.opencode/agents/session-logger.md`,
  `.opencode/agents/decision-advisor.md` — nine focused subagents created on branch
  `chore/opencode-subagents`.
- `AGENTS.md`, `CLAUDE.md` — added a Subagents section to AGENTS.md and mirrored it to
  CLAUDE.md.

### Skill(s) / Tool(s) Used

- `opencode`
- `senior-backend`
- `gitnexus`
- `playwright-mcp`
- `code-reviewer` (subagent exercised)
- `security-auditor` (subagent exercised)

### Status

in-progress — the branch `chore/opencode-subagents` is not committed or merged yet.

## Session 2026-11-16 19:00

### Changes

- `playwright.config.ts`, `e2e/specs/*.spec.ts`, `.github/workflows/ci.yml`,
  `docs/TICKETS.md`, `docs/E2E_TESTING.md`, `docs/DECISIONS.md` (D-028), `CHANGELOG.md` —
  T-006 smoke project, CI gate and incremental tagging.

### Skill(s) / Tool(s) Used

- `code-reviewer`

### Status

in-progress — T-006 implemented locally; its pull request awaits the human's merge
confirmation.

## Session 2026-11-16 18:45

### Changes

- `scripts/scan-secrets.sh`, `scripts/publish-github.sh`, `.github/workflows/ci.yml` — T-007:
  the secret scanner now runs in CI and in the publish script.
- `e2e/specs/`, `e2e/fixtures/`, `e2e/helpers/`, `playwright.config.ts`, `docs/E2E_TESTING.md` —
  T-005: restructured e2e folder and shared helpers.
- `.github/workflows/release.yml`, `scripts/changelog-section.mjs`, `docs/VERSIONING.md`,
  `docs/DECISIONS.md` (D-027), `CHANGELOG.md` — T-004: release workflow with scoped write.

### Skill(s) / Tool(s) Used

- `code-reviewer`
- `senior-backend`

### Status

in-progress — T-007 and T-005 are green as PRs #12 and #13; T-004 is implemented locally;
pull requests await the human's merge confirmation.

## Session 2026-11-16 17:35

### Changes

- `docs/PLAN.md` (locked browser target + P0-2 acceptance), `docs/TICKETS.md` (T-010),
  `docs/DECISIONS.md` (D-023 closed, D-026), `docs/PROGRESS.md`, `docs/E2E_TESTING.md`,
  `docs/DEVELOPMENT.md`, `CHANGELOG.md` — Safari removed as a browser target.
- `playwright.config.ts` — WebKit project removed. `e2e/sqlite-persistence.spec.ts` — WebKit
  skip block removed; all specs now run on Chromium and Firefox only.

### Skill(s) / Tool(s) Used

- `code-reviewer`

### Status

in-progress — the scope reduction is implemented; its pull request into `dev` awaits the
human's merge confirmation.

## Session 2026-11-16 17:20

### Changes

- `src/app/module-contract.ts`, `src/app/registry.ts`, `src/app/AppShell.tsx`,
  `src/app/routes.tsx`, `src/app/App.tsx`, `src/app/ModulePlaceholder.tsx` — the shell,
  registry and BrowserRouter tree.
- 11 module manifests + lazy screens under `src/modules/*/`.
- `src/test/setup.ts` — `matchMedia` polyfill for jsdom; `e2e/shell.spec.ts` — 12 new e2e tests.
- `docs/DECISIONS.md` (D-025), `docs/TICKETS.md`, `docs/PROGRESS.md`, `CHANGELOG.md` — updated.

### Skill(s) / Tool(s) Used

- `senior-frontend`
- `ui-ux-pro-max`
- `gitnexus`
- `playwright-mcp`

### Status

in-progress — T-016 is implemented and green; its pull request into `dev` awaits the human's
merge confirmation.

## Session 2026-11-16 16:50

### Changes

- `src/core/audit/write.ts`, `src/core/db/relationships.ts`, `src/core/db/repository.ts` —
  T-015 repository helpers with same-transaction audit writes and parent/child refusal.
- `src/core/db/repository.test.ts` — 14 tests, including rollback and child refusal.
- `docs/DECISIONS.md` (D-024), `docs/TICKETS.md`, `docs/PROGRESS.md`, `CHANGELOG.md` — the
  human split the audit write between T-015 and T-030, and chose explicit audit context.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `gitnexus`
- `code-reviewer`

### Status

in-progress — T-015 is implemented and green; its pull request into `dev` awaits the human's
merge confirmation.

## Session 2026-11-16 16:35

### Changes

- `src/core/db/uuid.ts`, `src/core/dates/clock.ts`, `src/core/dates/dates.ts`,
  `src/core/money/money.ts` — the T-014 core helpers.
- Three new test files: 30 tests for UUIDv7, the injectable clock, Dhaka dates and months,
  and money arithmetic in both digit scripts.
- `package.json`, `pnpm-lock.yaml` — replaced the unused `uuid` package with `uuidv7`, as
  PLAN.md §3 specifies.
- `README.md` — corrected the `core/` layout after the helpers moved into `dates/`.
- `docs/PROGRESS.md`, `CHANGELOG.md`, `docs/DECISIONS.md` — updated; the last records the
  human's acceptance of the Safari gap on 2026-11-16.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `code-reviewer`
- `gitnexus`

### Status

in-progress — T-014 is implemented and green; its pull request into `dev` awaits the human's
merge confirmation.

## Session 2026-11-16 16:00

### Changes

- `src/core/db/split-sql.ts`, `src/core/db/migrate.ts`, `src/core/db/migrations.ts` — the
  append-only migration runner and its registry.
- Seven SQL files under `src/modules/*/migrations/` contributing the full schema.
- `src/core/db/split-sql.test.ts`, `src/core/db/migrate.test.ts` — 9 new tests.
- `docs/PROGRESS.md`, `CHANGELOG.md` — updated.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `code-reviewer`

### Status

in-progress — T-013 is implemented and green; its pull request into `dev` awaits the human's
merge confirmation.

## Session 2026-11-16 15:40

### Changes

- `src/core/db/testing/better-sqlite3.ts` — the `Db` test double on better-sqlite3.
- `src/core/db/contract.ts` — one contract suite shared by every implementation.
- `src/core/db/testing/better-sqlite3.test.ts` — registers the suite for this implementation.
- `docs/PROGRESS.md`, `CHANGELOG.md` — updated.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `code-reviewer`

### Status

in-progress — T-012 is implemented and green. Its PR is stacked on the still-open PR #4; both
await the human's merge confirmation.

## Session 2026-11-16 15:30

### Changes

- `src/core/db/types.ts`, `src/core/db/queue.ts`, `src/core/db/client.ts` — the serialized
  `Db` client with a real transaction contract.
- `src/core/db/worker.ts` — BEGIN, COMMIT and ROLLBACK over Comlink.
- `src/core/db/queue.test.ts`, `src/core/db/client.test.ts` — 8 new unit tests.
- `src/app/dev/DbSpikeHarness.tsx`, `e2e/sqlite-persistence.spec.ts` — a browser-level
  rollback check.
- `docs/PROGRESS.md`, `CHANGELOG.md` — updated.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `playwright-mcp`
- `code-reviewer`

### Status

in-progress — T-011 is implemented and green; its pull request into `dev` awaits the human's
merge confirmation.

## Session 2026-11-16 15:10

### Changes

- `src/core/db/worker.ts` — sqlite-wasm + opfs-sahpool VFS in a Worker, exposed over Comlink.
- `src/core/db/client.ts` — the main-thread Worker wrapper.
- `src/app/dev/DbSpikeHarness.tsx` — temporary `/__db-spike` harness for browser verification.
- `src/app/App.tsx` — serves the harness at its path; removed in P0-3.
- `e2e/sqlite-persistence.spec.ts` — persistence, byte round-trip, and console/network specs.
- `playwright.config.ts` — added Firefox and WebKit projects.
- `docs/DECISIONS.md` — D-023 records the cross-browser findings, including the WebKit OPFS
  gap and the local library fix.
- `docs/PROGRESS.md`, `docs/E2E_TESTING.md`, `CHANGELOG.md` — updated.
- `.github/workflows/ci.yml` — CI now installs chromium, firefox and webkit with their
  system dependencies. The first run of PR #3 failed because only chromium was installed.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `senior-frontend`
- `playwright-mcp`
- `code-reviewer`

### Status

in-progress — Chromium and Firefox pass; Safari on macOS is still unverified, so P0-2 cannot
be closed yet. The pull request into `dev` awaits the human's merge confirmation.

## Session 2026-11-16 08:35

### Changes

- PR #1 — squash-merged into `dev` on the human's explicit confirmation.
- `.husky/commit-msg`, `.husky/pre-commit` — added; commitlint and lint-staged now run on
  commit.
- `commitlint.config.js` — added, enforcing the scope allowlist, the nine allowed types, the
  72-character subject limit, lowercase imperative subjects, no trailing period and the
  forbidden-subject list.
- `package.json` — added the four dev dependencies and the `lint-staged` configuration.
- `docs/COMMIT_SYSTEM.md` §7 — records the chosen enforcement mechanism.
- `docs/DECISIONS.md` — D-018 to D-022 record the five decisions the human made.
- `docs/PROGRESS.md`, `CHANGELOG.md` — updated.

### Skill(s) / Tool(s) Used

- `gitnexus`
- `code-reviewer`
- `senior-backend`

### Status

in-progress — commit message enforcement is implemented and verified locally, but its pull
request into `dev` is awaiting the human's merge confirmation.

## Session 2026-11-16 07:35

### Changes

- `docs/PRD.md` — product vision, scope, the six critical workflows, success criteria.
- `docs/TAD.md` — layering, the `Db` contract, the full schema, module ownership, the
  migration and backup rules.
- `docs/SECURITY.md` — threat model, PIN and role enforcement, the data guardrails, CSP and
  supply-chain rules.
- `docs/FRONTEND_SPEC.md` — design tokens, layout, the route map, every screen, the component
  inventory, states and accessibility.
- `docs/TICKETS.md` — 42 tickets across the repo foundation and PLAN phases P0 to P7.
- `docs/REPO_RULES.md` — the confirmation protocol, merge rules, code conventions, the
  Definition of Done and the bug protocol.
- `docs/BUGS.md` — initialised empty.
- `docs/BRANCHING.md` — branch types, lifecycle, release and hotfix flow, protection rules.
- `docs/COMMIT_SYSTEM.md` — commit format, types, the allowed-scope vocabulary.
- `docs/VERSIONING.md` — SemVer, the version sources of truth, the release procedure.
- `docs/E2E_TESTING.md` — the Playwright MCP workflow, spec rules, the coverage matrix, the
  failure protocol and the merge gates.
- `docs/DEVELOPMENT.md` — trimmed to the operational reference; the rules it used to carry now
  live in the documents above.
- `docs/ARCHITECTURE.md`, `docs/CONVENTIONS.md`, `docs/DATA-MODEL.md`, `docs/UI-GUIDELINES.md`,
  `docs/TESTING.md` — removed; their rules were folded into the new set.
- `CHANGELOG.md`, `session_log.md` — created.
- `AGENTS.md` — rewritten to the required structure.
- `.github/pull_request_template.md` — added.
- `.github/workflows/ci.yml` — the trigger now covers `dev` as well as `main`, for both pushes
  and pull requests. Without it, the required status checks on `dev` could never pass.
- `dev` branch — created and pushed.
- Branch protection on `main` and `dev`: pull request required, both CI jobs required and
  the branch up to date, no force-push, no deletion, conversation resolution required,
  enforced on admins.
- The repository allows squash and merge commits but not rebase, because `dev` takes squash
  merges from working branches while `main` takes a merge commit from `dev`. GitHub does not
  support a merge method per branch, so the distinction is enforced by the documented rules
  in `docs/BRANCHING.md` §7.
- Pull request #1 opened into `dev`. It is **not** merged: `docs/REPO_RULES.md` §1.3 requires
  the human's explicit confirmation at merge time.

### Skill(s) / Tool(s) Used

- `skill-creator`
- `senior-backend`
- `senior-frontend`
- `ui-ux-pro-max`
- `frontend-design`
- `code-reviewer`
- `gitnexus`
- `playwright-mcp`

### Status

completed

## Session 2026-11-18 03:05

### Changes

- `e2e/specs/full-journey.spec.ts` — added the single admission → payment → receipt → backup →
  restore journey spec (T-090); follows one student and asserts each outcome on product screens.
- `src/app/dev/PaymentFixture.tsx` — additive student-name readout and break control on the
  existing test-only route so the restore leg can corrupt and verify the journey student.
- `docs/DECISIONS.md` — D-065 (autonomous decision for T-090).
- `docs/PROGRESS.md`, `CHANGELOG.md` — T-090 entry.

### Skill(s) / Tool(s) Used

- `gitnexus` (impact + detect-changes)
- `senior-frontend`, `e2e-tester` (Playwright specs, Chromium + Firefox)
- `code-reviewer`, `security-auditor`

### Status

- completed

## Session 2026-11-18 14:03

### Changes

- `src/core/audit/undo.ts` — `inversePatch` skips redacted binary columns; binary-only updates are
  refused with a typed `InvalidAuditEntryError`; mixed updates keep their text-only inverse patch.
- `src/core/audit/undo.test.ts` — two regression tests (binary-only refusal, mixed update without
  BLOB corruption) that fail before the fix and pass after.
- `docs/BUGS.md`, `CHANGELOG.md`, `docs/PROGRESS.md` — BUG-007 fixed status, changelog entry and
  verification record.

### Skill(s) / Tool(s) Used

- `gitnexus` (impact on inversePatch/undoWithin; detect-changes before commit)
- `vitest` (regression tests), `playwright` (full E2E suite)

### Status

- completed — branch `fix/undo-blob-marker`, merged into `dev` as #62

## Session 2026-11-18 14:13

### Changes

- `src/core/auth/session.ts` — added `checkIdle()`; the idle interval checks for expiry without
  refreshing the activity clock, while real pointer/key events still refresh it.
- `src/core/auth/session.test.ts` — deterministic 660-tick regression that fails before the fix;
  mocks restored after each test.
- `docs/BUGS.md`, `CHANGELOG.md`, `docs/PROGRESS.md` — BUG-012 fixed status, changelog entry and
  verification record.

### Skill(s) / Tool(s) Used

- `gitnexus` (impact on noteActivity/startIdleWatcher; detect-changes before commit)
- `vitest` (regression tests), `playwright` (full E2E suite)

### Status

- completed — branch `fix/idle-lock-e2e`, PR pending; no merge performed

## Session 2026-11-18 14:22

### Changes

- Merged `origin/dev` (the squash of PR #62) into `fix/idle-lock-e2e` with a normal merge commit;
  resolved housekeeping-doc conflicts keeping both BUG-007 and BUG-012 entries. No fix was reverted.

### Skill(s) / Tool(s) Used

- `gitnexus` (detect-changes), `vitest`, `playwright`

### Status

- completed — conflict resolution only; PR #63 remains open for the human to merge

## Session 2026-11-18 16:06

### Changes

- `origin/dev` merged into `feature/glass-theme` with a normal merge commit (BUG-007, BUG-012).
- `src/index.css` — OpenDesign tokens in one place; flat 0px radius, no shadows/gradients,
  glass on sidebar/cards only, solid tables, print neutralised.
- `src/core/theme/theme-context.ts`, `src/core/theme/ThemeProvider.tsx`, `src/main.tsx` —
  next-themes provider mounted, stored theme applied pre-render.
- `src/modules/settings/{defaults,repository,SettingsScreen}.tsx` and both locale files —
  theme setting plus labelled Light/Dark/System control (en + bn).
- `src/modules/dashboard/Screen.tsx` — KPI cards use the shared glass-card surface.
- `docs/{DECISIONS,PROGRESS}.md`, `CHANGELOG.md` — D-068/D-069 and housekeeping.

### Skill(s) / Tool(s) Used

- `open-design` (one get_artifact bundle pull), `senior-frontend` (check_ui.mjs screenshots),
  `vitest`, `playwright`, `gitnexus` (blast-radius checks)

### Status

- completed — `pnpm check` green; full E2E 238 passed in two halves; PR opened into `dev`, not merged.
