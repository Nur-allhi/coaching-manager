# Changelog

All notable changes to **Coaching Manager** are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The version source of
truth is `package.json`; see [`docs/VERSIONING.md`](docs/VERSIONING.md).

Entries move from `[Unreleased]` into a version heading when that version is tagged. The
per-session history lives in [`session_log.md`](session_log.md); this file is the curated,
human-readable subset.

## [Unreleased]

### Added

- CSV and Excel import tools at `/data-tools/import` (T-081, D-061): a downloadable template,
  editable column mapping, a row-level validation preview and dry run that writes nothing,
  idempotent students (number or phone + name), and a forced pre-import snapshot before one
  audited transaction commits the valid rows.

- PIN lock and roles (T-080, D-060): an opt-in admin PIN stored only as a PBKDF2-SHA-256 hash
  (600,000 iterations, per-device salt) in localStorage, an inactivity lock screen (10-minute
  default, configurable in Settings), and the Admin/Accountant/Teacher permission matrix enforced
  in services — a Teacher's payment write is refused, and a permission hidden in the UI is also
  refused by the service.

### Fixed

- Opening `/exams/:id` for a missing or deleted exam now shows an honest "Exam not found" state with a retry action instead of a blank grid, and no longer logs TanStack Query's "Query data cannot be undefined" console error (BUG-011, D-053).
- Opening an attendance session now writes one `create` audit row instead of two — the redundant manual audit was removed, with a regression test (BUG-010).
- The dues report no longer overflows horizontally at phone and tablet widths; its grid columns shrink to the available width (BUG-009).
- The app now loads offline after one visit: the SQLite WASM binary is precached by the service worker (BUG-004), and the Settings persistence-status element has its test id again (BUG-005).
- Audit snapshots now store a compact `<blob:N bytes>` marker instead of per-byte JSON for binary columns, so a bounded photo cannot bloat the audit log (T-042).
- The migration SQL splitter now keeps `CREATE TRIGGER ... BEGIN/END` bodies as one statement, so FTS5 sync triggers apply correctly (T-042).
- The dev snapshot harness no longer overflows horizontally at 375px; the sidecar JSON now wraps (BUG-003).

### Added

- An admin report at `/reports/admin`, monthly or per academic year, with admissions (by class and batch), drop-outs, collected, outstanding dues, collection by method, attendance rate, top performers and net — all totals sourced from the owning modules, printable on A4 and exportable to Excel (T-073, D-059).
- The full report catalogue on `/reports`: student list, admissions, payment register, dues, receipts by date range, attendance and result sheets, each filterable with a displayed total that matches the owning module (T-072, D-058). The admin report follows in T-073.
- A reports framework at `/reports`: a filter bar, a preview and CSV/Excel exports driven by the exact same filtered rows (CSV carries a UTF-8 BOM for Bangla in Excel), plus an A4 print view, with the student list as the first report (T-071, D-057).
- A dashboard at `/`: KPI cards for collected fees, outstanding dues, admissions, active students, today's batches and low attendance (each linking to the filtered list behind it), recent toppers and a stale-backup warning (T-070, D-056).
- A leaderboard at `/leaderboard`: competition ranks (ties share a rank and the next rank skips), per-exam / per-month / per-academic-year scopes, batch and class filters, absent counted as zero but excluded from averages, and an A4 print view (T-063, D-055).
- Grades and GPA in the marks grid: each student's grade letter and grade points come from the live Settings grading scale, a batch GPA summarises the entered marks, and both update as marks change (T-062, D-054).
- Exams and a marks grid: create one exam per batch/subject/date, enter marks per student in a keyboard-navigable grid, flag absences with "A" instead of a zero, and see a live batch average that excludes absent students (T-061, D-052).
- Attendance sessions and a keyboard-navigable grid: open a session per batch/date, mark the whole roster present in one action, toggle individuals, and see live percentages (T-060, D-051).
- A dues and defaulters report at `/payments/dues`: batch, class and amount-range filters with a total over exactly the rows shown, only students who still owe money, and a real Payments tab on the student profile with payment history and outstanding dues (T-053, D-049).
- Edit and void a payment: editing re-runs allocation in one transaction, keeps the receipt number and increments `revision` (shown as REVISED n on the receipt), while voiding keeps the row and receipt but stops its allocations counting. The real `/payments` screen lists recent payments with Edit/Void and a receipt preview (T-052, D-048).
- Record a payment with allocation: partial, advance and multi-month payments allocated oldest-first in one transaction, gapless `R-YYYY-000001` receipt numbers from a counter, advances reused when later charges are generated, and a real collect screen with a live dues preview (T-051, D-047).
- Fee rules: idempotent admission and monthly charge generation per enrollment, with fixed and percent discounts correct to the paisa and a unique key (not a flag) that prevents duplicate charges (T-050, D-046).
- A deterministic seed generator: `pnpm seed --students 5000 [--seed N] [--out FILE]` writes a reproducible student dataset to `test-results/`, shared by the performance benchmark and the e2e seed spec (T-044, D-045).
- An Enrollments module: enroll, transfer between batches in one audited transaction (the old enrollment stays closed in history), a leave date, fixed/percent discounts shown as net fees, fee defaults from the batch and a non-blocking capacity warning (T-043, D-044).
- A Students module: admission with per-year `YYYY-0001` numbers, edit, soft delete and restore from a trash view, status changes, a bounded optional photo, FTS5 search over name/phone/guardian/number, filters, a virtualized list and a six-tab profile shell (T-042, D-043).
- An Academics module: academic years, classes, subjects and batches with audited CRUD, edit and soft delete, a live same-room schedule-clash warning and a non-blocking capacity warning (T-041, D-042).
- A Settings module: centre profile, currency, receipt format, an editable seven-row grading scale (TAD §5.7 defaults), language toggle, and backup/storage status, all persisted and validated (T-040, D-041).
- Startup migration with a pre-migration snapshot and a recovery screen (PLAN §7.4).
- A real Backups page listing snapshots with reason/size/date, a 7-day stale-export warning, and a shared optimistic mutation helper with rollback (T-035, D-040).
- A 10-second Undo toast after mutations and a generic History panel that lists a record's audit entries and restores any version (T-034, D-039).
- Portable database file export/import: a raw `.sqlite` export, optional AES-GCM encrypted backup in a self-describing container (PBKDF2-SHA-256, 600k iterations), and import that reuses the validated restore path (T-033, D-038).
- A single-tab lock: a second tab shows an "already open in another tab" screen before any Worker or database client is created, and the lock releases when the tab closes (T-018, D-037).
- Safe restore from a snapshot: checksum/header/schema validation, a summary, a forced pre-restore snapshot, rollback of the live bytes if the import fails, and an end-to-end spec that breaks and restores the data.
- OPFS snapshots with a sidecar manifest (reason, schema version, SHA-256, size and row counts), checksum dedupe and rotation to the newest 10, plus an end-to-end spec that proves the offline data can be snapshotted repeatedly.
- An i18n scaffold: i18next with full English and Bangla resources, a sidebar language toggle,
  an independent Bangla-digits setting using `Intl.NumberFormat('bn-BD')`, and no hard-coded
  user-visible strings in components (T-020, D-033).
- Void writes, undo and the History data surface in the audit layer: voids and inverses are audited in the same transaction, original history is never rewritten, and undo of a soft delete is a real restore write.
- Persistent storage is requested once on first run and its status is shown in Settings. The Workbox service worker now claims the page on install, and a new `offline.spec.ts` proves offline reload, installability and the status row.
- Autonomous build mode (`docs/AUTONOMY.md`) with decide-and-record, bounded retries and auto-merge to `dev` after green CI; scheduled nightly runs stay in worktrees and never touch `main`.
- A global error boundary with a recoverable screen that restores unsaved form values, and an
  unsaved-changes guard that blocks in-app navigation and tab close (D-029).
- A data router (`createBrowserRouter`/`RouterProvider`) built from the module registry, so
  `useBlocker` can guard navigation.
- A `smoke` Playwright project and a CI gate that runs `@smoke` specs on pull requests; the
  offline and shell-route specs are tagged, with W1–W6 tagged as those features land (D-028).
- A release workflow that publishes a GitHub release from a `vX.Y.Z` tag, using that version's
  CHANGELOG section as the body, with write permission scoped to the release job alone.
- A CI secret scan on every push and pull request, sharing one scanner with the publish script.
- The app shell: a module registry, an 11-entry sidebar that becomes a sheet below 768px, a
  sticky header, a BrowserRouter with one lazy route per module, and a 404 screen.
- Repository helpers with version-checked updates, soft delete, an audit row written in the
  same transaction, a readable refusal when a parent still has live children, and a context
  argument that carries the actor, time and id generator explicitly.
- Core helpers: UUIDv7 ids, an injectable clock, Dhaka date and month helpers, and
  integer-paisa money arithmetic with percent discounts, South Asian grouping and Bengali
  digits. The unused `uuid` dependency was replaced by `uuidv7`.
- An append-only migration runner with `app_meta.schema_version`, a pre-migration snapshot
  hook, rollback on failure, and seven module-owned SQL migrations covering the full schema.
- A `better-sqlite3` implementation of the `Db` contract and a shared contract suite, so
  repository and service tests run against real SQL without a browser.
- The serialized `Db` client: one promise queue, `tx` with BEGIN/COMMIT/ROLLBACK, nested
  transaction refusal, and unit tests for the queue and the transaction contract.
- sqlite-wasm in a dedicated Web Worker with the `opfs-sahpool` VFS, plus a Comlink client
  and a temporary `/__db-spike` verification harness.
- Playwright end-to-end specs for database persistence and the export/import round-trip,
  running on Chromium and Firefox, with WebKit smoke coverage.
- Husky, commitlint and lint-staged: commit messages are validated on commit, and staged
  files are linted and formatted before the commit lands.
- The 11 governing documents under `docs/`: PRD, TAD, SECURITY, FRONTEND_SPEC, TICKETS,
  REPO_RULES, BUGS, BRANCHING, COMMIT_SYSTEM, VERSIONING and E2E_TESTING.
- `session_log.md`, recording every AI session.
- `CHANGELOG.md`, following Keep a Changelog.
- The `dev` integration branch, with branch protection on `dev` and `main`: pull request
  required, CI required, no force-push, no deletion.
- `.github/pull_request_template.md`, matching the template in `docs/BRANCHING.md` §6.
- A GitHub Actions CI workflow: typecheck, lint, unit tests, format check, build, the
  initial-JavaScript budget, then Playwright end-to-end against the production build. It runs
  for pushes and pull requests on `dev` and on `main`.
- `scripts/check-bundle-budget.mjs`, enforcing the 300 KB initial-JavaScript budget.
- `public/_headers`, carrying the Content-Security-Policy and the other hardening headers.
- `scripts/publish-github.sh`, which creates the public repository and pushes it over SSH.

### Changed

- The app was renamed to **Coaching Manager**.
- The third-party agent skills moved out of version control. They are installed locally and
  are git-ignored; they are not ours to licence.
- `dev` became the integration branch; `main` receives releases only.

### Removed

- Safari/WebKit as a browser target (D-026). The locked browser list is now Chrome/Edge and
  Firefox; the WebKit Playwright project and its four OPFS-skipped specs are gone.
- Five superseded documents (`ARCHITECTURE`, `CONVENTIONS`, `DATA-MODEL`, `UI-GUIDELINES`,
  `TESTING`). Their rules were folded into the new set so that each rule lives in exactly one
  document.

## [0.1.0] — 2026-11-16

### Added

- The project scaffold: Vite 8, React 19, TypeScript in strict mode, ESLint, Prettier,
  Vitest, Playwright, Tailwind CSS v4 and shadcn/ui.
- The folder layout from the plan: `src/app`, `src/core`, `src/modules`.
- A PWA service worker and manifest with generated icons.
- Self-hosted Noto Sans and Noto Sans Bengali, so the app makes no remote font request.
- A unit test and an end-to-end smoke test, including a guard that the page contacts no host
  other than its own origin.

[Unreleased]: https://github.com/Nur-allhi/coaching-manager/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Nur-allhi/coaching-manager/releases/tag/v0.1.0
