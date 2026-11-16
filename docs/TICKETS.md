# TICKETS — Feature Ticket List

**Status:** live · **Rule source:** [`REPO_RULES.md`](REPO_RULES.md),
[`BRANCHING.md`](BRANCHING.md), [`COMMIT_SYSTEM.md`](COMMIT_SYSTEM.md),
[`VERSIONING.md`](VERSIONING.md)

One ticket = one branch = one PR. Tickets are atomic: if a ticket needs two branches, or
would push a file past 300 LOC, it is split before it is accepted.

**Relationship to the plan.** `PLAN.md` is the plan of record and owns the scope, the phases
and the acceptance lines. This file owns the _execution_: which branch, which skill, which
commit scope, which E2E spec. Every ticket names the plan task it implements. When the two
disagree about **what** to build, the plan wins; when they disagree about **how to ship it**,
this file wins.

**Scopes.** Every `Commit scope` below is an allowed scope from
[`COMMIT_SYSTEM.md`](COMMIT_SYSTEM.md) §4.

---

## Phase 0 — Repository and quality foundation

### T-001: Establish the documentation baseline

- **Skill:** `skill-creator`
- **Depends on:** none
- **Branch:** `docs/foundation-documents`
- **Commit scope:** `docs`
- **Scope:** Create the 11 governing documents under `docs/`, plus `CHANGELOG.md`,
  `session_log.md` and the rewritten `AGENTS.md`. Retire the superseded documents by folding
  their rules into the new set. Every code file stays under 300 LOC.
- **Acceptance:**
  - [ ] `docs/PRD.md`, `TAD.md`, `SECURITY.md`, `FRONTEND_SPEC.md`, `TICKETS.md`,
        `REPO_RULES.md`, `BUGS.md`, `BRANCHING.md`, `COMMIT_SYSTEM.md`, `VERSIONING.md` and
        `E2E_TESTING.md` all exist.
  - [ ] No rule is stated in two documents; cross-references use links, not restatements.
  - [ ] `CHANGELOG.md` follows Keep a Changelog and has an `[Unreleased]` heading.
  - [ ] `session_log.md` records this session in the required format.
  - [ ] `AGENTS.md` lists the skills and tools, the project structure, the workflow rules and
        a pointer to `session_log.md`.
  - [ ] `docs/BUGS.md` exists with the header and the "no known bugs" placeholder.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** none

### T-002: Enforce the commit message format

- **Skill:** `gitnexus`
- **Depends on:** T-001
- **Branch:** `chore/commit-message-enforcement`
- **Commit scope:** `repo`
- **Scope:** Add commit message validation matching `COMMIT_SYSTEM.md` §3. The approach is a
  decision (Option A Husky + commitlint + lint-staged, Option B commitlint in CI only,
  Option C a dependency-free git hook script) and MUST be confirmed before anything is
  installed.
- **Acceptance:**
  - [ ] The chosen mechanism is recorded in `docs/DECISIONS.md` with the reason.
  - [ ] A commit with a forbidden message is rejected, e.g. `fixed stuff`.
  - [ ] A commit with no scope is rejected.
  - [ ] A valid commit passes, e.g. `feat(payments): add partial payment allocation`.
  - [ ] `pnpm check` still passes.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** none

### T-003: Create dev, add the PR template, protect the branches

- **Skill:** `gitnexus`
- **Depends on:** T-001
- **Branch:** `chore/branching-setup`
- **Commit scope:** `repo`
- **Scope:** Create and push `dev`, add `.github/pull_request_template.md` from
  `BRANCHING.md` §6, and configure branch protection on `main` and `dev` per `BRANCHING.md`
  §7. The exact protection settings MUST be confirmed before they are applied.
- **Acceptance:**
  - [ ] `dev` exists on the remote and `main` is the default branch.
  - [ ] `main` requires a PR, requires the CI status check, forbids force-push and deletion,
        and allows merge commits only.
  - [ ] `dev` requires a PR, requires the CI status check, forbids force-push and deletion,
        and allows squash merges only.
  - [ ] Opening a pull request shows the template with its sections.
  - [ ] `docs/DECISIONS.md` records the protection settings that were applied.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** none

### T-004: Extend CI to dev, main and releases

- **Skill:** `gitnexus`
- **Depends on:** T-003
- **Branch:** `ci/dev-main-pipelines`
- **Commit scope:** `ci`
- **Scope:** Extend `.github/workflows/ci.yml` to run on `dev` as well as `main`, and add a
  release workflow that publishes a GitHub release from a `vX.Y.Z` tag. Keep every action
  pinned to a commit SHA and `permissions: contents: read`.
- **Acceptance:**
  - [ ] A push to `dev` runs the quality job and the e2e job.
  - [ ] A push to `main` runs the same jobs.
  - [ ] Tagging `v0.1.0` produces a GitHub release whose body is the CHANGELOG section for
        that version.
  - [ ] Every action in every workflow is pinned to a SHA.
  - [ ] The bundle budget step runs in the quality job.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** none

### T-005: Build the Playwright MCP verification harness

- **Skill:** `senior-frontend`
- **Depends on:** T-001
- **Branch:** `test/playwright-mcp-harness`
- **Commit scope:** `test`
- **Scope:** Restructure `e2e/` into `e2e/specs/`, `e2e/fixtures/` and `e2e/helpers/`, and
  add the helpers the MCP workflow in `E2E_TESTING.md` §4 needs: a seeded database, a
  viewport list, and a console-error collector.
- **Acceptance:**
  - [ ] `e2e/specs/`, `e2e/fixtures/` and `e2e/helpers/` exist.
  - [ ] `pnpm e2e` still runs and passes.
  - [ ] A helper reports console errors for a page, so a spec can assert zero.
  - [ ] No file in `e2e/` exceeds 300 LOC.
- **E2E:** n/a — test infrastructure only
- **Version impact:** none

### T-006: Tag the smoke suite

- **Skill:** `senior-frontend`
- **Depends on:** T-005
- **Branch:** `test/smoke-suite`
- **Commit scope:** `test`
- **Scope:** Tag the critical journeys from `PRD.md` §5 with `@smoke` and make the smoke
  project run on every pull request into `dev`, separately from the full suite.
- **Acceptance:**
  - [ ] At least one spec per critical journey in `PRD.md` §5 carries `@smoke`.
  - [ ] `pnpm e2e --grep @smoke` runs only the smoke specs.
  - [ ] The CI e2e job runs the smoke project on pull requests and the full suite on `dev`
        and `main`.
- **E2E:** `smoke.spec.ts` — one spec per critical journey, each asserting its outcome
- **Version impact:** none

### T-007: Keep secrets out of the repository

- **Skill:** `code-reviewer`
- **Depends on:** T-001
- **Branch:** `chore/secret-scan`
- **Commit scope:** `ci`
- **Scope:** Run the secret scan that `scripts/publish-github.sh` uses as a CI step on every
  push and pull request, so a credential cannot reach `main` unnoticed.
- **Acceptance:**
  - [ ] CI fails when a file matching the secret pattern is committed.
  - [ ] The scanner does not match its own source, and no file is excluded from the scan.
  - [ ] `pnpm check` passes on a clean tree.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** none

---

## Phase 0 — Foundation (PLAN.md P0-2 to P0-6)

### T-010: Spike sqlite-wasm in a Worker on OPFS

- **Skill:** `senior-backend`
- **Depends on:** T-001
- **Branch:** `feature/sqlite-worker-spike`
- **Commit scope:** `db`
- **Scope:** Implement PLAN.md **P0-2**: sqlite-wasm in a dedicated Web Worker with the
  `opfs-sahpool` VFS. Create a table, insert a row, reload the page, and confirm the data
  persists. Round-trip `exportBytes` and `importBytes`.
- **Acceptance:**
  - [ ] A table survives a full page reload in Chrome, Firefox and Safari.
  - [ ] `exportBytes()` then `importBytes()` restores the same rows.
  - [ ] The UI thread does not block while a write runs.
  - [ ] The findings are written to `docs/DECISIONS.md`.
- **E2E:** `sqlite-persistence.spec.ts` — writes a row, reloads, and asserts the row is still
  there
- **Version impact:** none

### T-011: Build the Db client with a serialized queue

- **Skill:** `senior-backend`
- **Depends on:** T-010
- **Branch:** `feature/db-client`
- **Commit scope:** `db`
- **Scope:** Implement the `Db` interface from `TAD.md` §3 over the worker, with one promise
  queue so a transaction can never interleave with another call.
- **Acceptance:**
  - [ ] `query`, `run` and `tx` behave as specified.
  - [ ] A transaction that throws rolls back every write inside it.
  - [ ] A call made during a transaction does not observe uncommitted rows.
  - [ ] The contract suite passes against both the wasm and the `better-sqlite3`
        implementation.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** none

### T-012: Add the better-sqlite3 test double

- **Skill:** `senior-backend`
- **Depends on:** T-011
- **Branch:** `feature/db-test-double`
- **Commit scope:** `db`
- **Scope:** Implement the same `Db` interface on `better-sqlite3` so repository and service
  tests run against real SQL without a browser.
- **Acceptance:**
  - [ ] The identical contract suite passes against both implementations.
  - [ ] Rollback on error is asserted on both.
  - [ ] `pnpm test` runs the suite in under 5 seconds.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** none

### T-013: Write the migration runner

- **Skill:** `senior-backend`
- **Depends on:** T-011
- **Branch:** `feature/migration-runner`
- **Commit scope:** `db`
- **Scope:** Implement PLAN.md **P0-4**: apply module-contributed migrations in order, track
  the applied version in `app_meta.schema_version`, run inside a transaction, and call the
  pre-migration snapshot hook.
- **Acceptance:**
  - [ ] Migrating an empty database and migrating a v1 database yield an identical schema.
  - [ ] A failing migration rolls back and leaves the schema unchanged.
  - [ ] The applied version is recorded and a re-run applies nothing.
  - [ ] Every migration has a fixture test from each earlier version.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** none

### T-014: Write the core helpers

- **Skill:** `senior-backend`
- **Depends on:** T-011
- **Branch:** `feature/core-helpers`
- **Commit scope:** `money`
- **Scope:** Implement PLAN.md **P0-5**: UUIDv7 ids, an injectable clock, money formatting,
  parsing and percent-discount rounding, and date helpers.
- **Acceptance:**
  - [ ] `applyPercentDiscount(3333, 15)` is `500`; `applyPercentDiscount(1000, 7)` is `70`.
  - [ ] No money helper accepts or returns a non-integer.
  - [ ] The clock is injectable, so no test depends on wall-clock time.
  - [ ] Bangla and English formatting both produce correct output.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** none

### T-015: Write the repository helpers

- **Skill:** `senior-backend`
- **Depends on:** T-014
- **Branch:** `feature/repository-helpers`
- **Commit scope:** `db`
- **Scope:** Implement insert, update with a version check, and soft delete, with the audit
  row written in the same transaction, using an explicit `{ actorId, now, newId }` context
  (D-024).
- **Acceptance:**
  - [ ] A stale `expectedVersion` aborts the update and raises a conflict error.
  - [ ] A soft-deleted row is hidden from list queries.
  - [ ] Every write produces an audit row with correct before and after JSON.
  - [ ] Deleting a parent with children is refused with a readable message.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** none

### T-016: Build the app shell, registry and router

- **Skill:** `senior-frontend`
- **Depends on:** T-011
- **Branch:** `feature/app-shell`
- **Commit scope:** `app`
- **Scope:** Implement PLAN.md **P0-6** shell: the sidebar and header, the module registry,
  and a React Router tree with one lazy route per module.
- **Acceptance:**
  - [ ] Every module registers a manifest and appears in the navigation.
  - [ ] Each route chunk is lazy; the initial bundle stays under the 300 KB budget.
  - [ ] The layout works at 375px, 768px and 1280px with no horizontal scroll.
  - [ ] The sidebar collapses into a sheet below 768px.
- **E2E:** `shell.spec.ts` — navigates every sidebar entry and asserts each route renders its
  heading
- **Decisions:** D-025 (BrowserRouter, shared placeholder, keep the spike harness lazy)
- **Version impact:** minor

### T-017: Add the error boundary and the unsaved-changes guard

- **Skill:** `senior-frontend`
- **Depends on:** T-016
- **Branch:** `feature/error-boundary`
- **Commit scope:** `app`
- **Scope:** A global error boundary that never loses form input, plus an unsaved-changes
  guard on every form.
- **Acceptance:**
  - [ ] A render error shows a recoverable message, not a blank page.
  - [ ] Form values survive a boundary error.
  - [ ] Navigating away with unsaved changes asks for confirmation.
- **E2E:** `error-boundary.spec.ts` — triggers a render error and asserts the recovery screen
  and that the form values are still present
- **Version impact:** minor

### T-018: Enforce the single-tab lock

- **Skill:** `senior-backend`
- **Depends on:** T-010
- **Branch:** `feature/single-tab-lock`
- **Commit scope:** `app`
- **Scope:** Acquire `navigator.locks.request('app-db-owner', { ifAvailable: true })` at start
  and refuse to touch the database when the lock is held.
- **Acceptance:**
  - [ ] A second tab shows the "already open in another tab" screen.
  - [ ] The second tab makes no database call.
  - [ ] The lock is released on unload.
- **E2E:** `single-tab.spec.ts` — opens a second tab and asserts the lock screen
- **Version impact:** minor

### T-019: Finish the PWA and request persistent storage

- **Skill:** `senior-frontend`
- **Depends on:** T-016
- **Branch:** `feature/pwa-persistence`
- **Commit scope:** `app`
- **Scope:** Finish the service worker, make the app installable, and request
  `navigator.storage.persist()` on first run.
- **Acceptance:**
  - [ ] The app is installable in Chrome.
  - [ ] The app loads with the network disabled after one online visit.
  - [ ] The storage persistence status is visible in Settings.
- **E2E:** `offline.spec.ts` — loads once, goes offline, reloads, and asserts the app still
  works
- **Version impact:** minor

### T-020: Scaffold i18n with English and Bangla

- **Skill:** `frontend-design`
- **Depends on:** T-016
- **Branch:** `feature/i18n-scaffold`
- **Commit scope:** `i18n`
- **Scope:** Set up i18next with English and Bangla resources, a language toggle, and Bangla
  digits behind a setting.
- **Acceptance:**
  - [ ] No user-visible string is hard-coded in a component.
  - [ ] Switching to Bangla translates the shell and leaves numbers in Latin digits.
  - [ ] Bangla digits can be enabled and every formatted number follows.
  - [ ] Bangla text renders with the Bengali family and correct conjunct shaping.
- **E2E:** `i18n.spec.ts` — switches to Bangla and asserts a label and the number format
- **Version impact:** minor

---

## Phase 1 — Safety net (PLAN.md P1-1 to P1-6)

### T-030: Wire the audit log into the repository layer

- **Skill:** `senior-backend`
- **Depends on:** T-015
- **Branch:** `feature/audit-writer`
- **Commit scope:** `audit`
- **Scope:** Implement PLAN.md **P1-1**: void writes, undo, and the History plumbing. The
  create/update/delete audit row itself is already written by T-015 (D-024).
- **Acceptance:**
  - [ ] A void writes an audit row, with before and after JSON matching the row.
  - [ ] Undo applies the inverse and writes a new audit entry; history is never rewritten.
  - [ ] The void or undo and its audit row commit or roll back together.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** minor

### T-031: Create snapshots with rotation and checksum dedupe

- **Skill:** `senior-backend`
- **Depends on:** T-013
- **Branch:** `feature/snapshots`
- **Commit scope:** `backup`
- **Scope:** Implement PLAN.md **P1-2**: write snapshots to OPFS with a sidecar manifest,
  keep the newest 10, and skip a snapshot when the database is unchanged.
- **Acceptance:**
  - [ ] Twelve changes produce exactly ten snapshot files.
  - [ ] A snapshot taken while the database is unchanged is skipped.
  - [ ] Each sidecar holds the reason, schema version, SHA-256, size and row counts.
- **E2E:** `snapshots.spec.ts` — makes twelve changes and asserts ten snapshots remain
- **Version impact:** minor

### T-032: Restore from a snapshot, safely

- **Skill:** `senior-backend`
- **Depends on:** T-031
- **Branch:** `feature/restore`
- **Commit scope:** `backup`
- **Scope:** Implement PLAN.md **P1-3**: validate, summarise, snapshot, then restore. If any
  step fails the live database MUST be untouched.
- **Acceptance:**
  - [ ] A corrupt file is rejected and the live data is unchanged.
  - [ ] A file with a newer schema version is rejected and the live data is unchanged.
  - [ ] A good restore round-trips the data.
  - [ ] A pre-restore snapshot exists before the live database is replaced.
- **E2E:** `restore.spec.ts` — breaks the data, restores from a snapshot, and asserts the data
  is back
- **Version impact:** minor

### T-033: Export and import the database file

- **Skill:** `senior-backend`
- **Depends on:** T-032
- **Branch:** `feature/database-file-transfer`
- **Commit scope:** `backup`
- **Scope:** Implement PLAN.md **P1-4**: export the database as a `.sqlite` file, optionally
  AES-GCM encrypted, and import it back with the same validation as a restore.
- **Acceptance:**
  - [ ] An exported file restores on a clean profile.
  - [ ] An encrypted export restores with the correct passphrase and fails with a wrong one.
  - [ ] The file is written with `showSaveFilePicker` where available and as a download
        otherwise.
- **E2E:** `file-transfer.spec.ts` — exports, wipes, imports and asserts the data is back
- **Version impact:** minor

### T-034: Add undo and the history panel

- **Skill:** `senior-frontend`
- **Depends on:** T-030
- **Branch:** `feature/undo-history`
- **Commit scope:** `audit`
- **Scope:** Implement PLAN.md **P1-5**: a generic undo mechanism and a reusable History
  component. Undo writes a new audit entry; history is never rewritten.
- **Acceptance:**
  - [ ] A create, an update and a delete can each be undone.
  - [ ] A toast offers Undo for 10 seconds after any mutation.
  - [ ] The History tab lists a record's audit entries and can restore a chosen version.
- **E2E:** `undo.spec.ts` — creates a student, undoes it, and asserts the record is gone
- **Version impact:** minor

### T-035: Build the backups page and the shared optimistic mutation helper

- **Skill:** `senior-frontend`
- **Depends on:** T-031, T-034
- **Branch:** `feature/backups-page`
- **Commit scope:** `ui`
- **Scope:** Implement PLAN.md **P1-6**: the Backups page, and one `useOptimisticMutation`
  helper every mutation goes through.
- **Acceptance:**
  - [ ] The Backups page lists the snapshots with reason, size and date.
  - [ ] The page warns when the last file export is older than 7 days.
  - [ ] Every mutation uses the shared helper and rolls back on error.
- **E2E:** `backups.spec.ts` — takes a snapshot, breaks the data, restores, and asserts the
  data is back
- **Version impact:** minor

---

## Phase 2 — Core records (PLAN.md P2-1 to P2-5)

### T-040: Build the settings module

- **Skill:** `senior-backend`
- **Depends on:** T-035
- **Branch:** `feature/settings-module`
- **Commit scope:** `settings`
- **Scope:** Centre profile, logo as a data URI, currency, grading scale, receipt format,
  language, backup status and storage persistence status.
- **Acceptance:**
  - [ ] Every setting persists and is read back after a reload.
  - [ ] The grading scale is editable and the default matches `TAD.md` §5.7.
  - [ ] Backup and storage status are shown.
- **E2E:** `settings.spec.ts` — changes the centre name and asserts it survives a reload
- **Version impact:** minor

### T-041: Build the academics module

- **Skill:** `senior-backend`
- **Depends on:** T-040
- **Branch:** `feature/academics-module`
- **Commit scope:** `academics`
- **Scope:** Academic years, classes, subjects and batches, with a schedule-clash warning and
  a capacity warning.
- **Acceptance:**
  - [ ] Full CRUD with edit and soft delete for all four entities.
  - [ ] Overlapping times in the same room on the same day raise a warning.
  - [ ] Exceeding capacity raises a warning and does not block the save.
- **E2E:** `academics.spec.ts` — creates a batch that clashes and asserts the warning appears
  and the save still succeeds
- **Version impact:** minor

### T-042: Build the students module

- **Skill:** `senior-frontend`
- **Depends on:** T-041
- **Branch:** `feature/students-module`
- **Commit scope:** `students`
- **Scope:** Admission, edit, soft delete and restore, status changes, photo, FTS5 search,
  filters, and the profile shell with its six tabs.
- **Acceptance:**
  - [ ] A student number is allocated `YYYY-0001` by admission year.
  - [ ] The list of 5,000 seeded students renders and searches in under 100 ms.
  - [ ] Search matches name, phone, guardian and student number.
  - [ ] A soft-deleted student is hidden from the list and restorable from the trash.
- **E2E:** `students.spec.ts` — admits a student, searches for them, edits them, and asserts
  the change
- **Version impact:** minor

### T-043: Build enrollments and batch transfer

- **Skill:** `senior-backend`
- **Depends on:** T-042
- **Branch:** `feature/enrollments-module`
- **Commit scope:** `enrollments`
- **Scope:** Enroll, transfer between batches, discounts and a leave date. A transfer closes
  one enrollment and opens another.
- **Acceptance:**
  - [ ] A transfer preserves the original enrollment in history.
  - [ ] The capacity warning appears when a batch is over capacity.
  - [ ] A fixed and a percent discount are both stored and displayed correctly.
- **E2E:** `enrollments.spec.ts` — transfers a student and asserts the old enrollment is
  closed and the new one is open
- **Version impact:** minor

### T-044: Build the seed generator

- **Skill:** `senior-backend`
- **Depends on:** T-043
- **Branch:** `feature/seed-generator`
- **Commit scope:** `scripts`
- **Scope:** `pnpm seed --students 5000` producing a deterministic dataset that every later
  test can rely on.
- **Acceptance:**
  - [ ] The command creates the requested number of students.
  - [ ] Two runs with the same seed produce the same data.
  - [ ] The generator is used by the performance and e2e suites.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** none

---

## Phase 3 — Money (PLAN.md P3-1 to P3-5)

### T-050: Implement fee rules and monthly charge generation

- **Skill:** `senior-backend`
- **Depends on:** T-043
- **Branch:** `feature/monthly-charges`
- **Commit scope:** `payments`
- **Scope:** Implement PLAN.md **P3-1**: the admission fee plus a monthly fee per enrollment,
  with fixed and percent discounts, generated idempotently.
- **Acceptance:**
  - [ ] Running the generator twice creates no duplicates.
  - [ ] A percent discount is correct to the paisa.
  - [ ] The unique key, not a flag, prevents duplicates.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** minor

### T-051: Record a payment with allocation

- **Skill:** `senior-backend`
- **Depends on:** T-050
- **Branch:** `feature/record-payment`
- **Commit scope:** `payments`
- **Scope:** Implement PLAN.md **P3-2**: partial payment, advance payment, multi-month
  payment and receipt numbering, all in one transaction.
- **Acceptance:**
  - [ ] The sum of allocations never exceeds the payment amount.
  - [ ] Receipt numbers are unique and gapless.
  - [ ] An advance is allocated automatically when future charges are generated.
  - [ ] A partial payment leaves the correct remainder due.
- **E2E:** `payments.spec.ts` — takes a partial payment and asserts the due amount and the
  receipt number
- **Version impact:** minor

### T-052: Edit and void a payment

- **Skill:** `senior-backend`
- **Depends on:** T-051
- **Branch:** `feature/edit-void-payment`
- **Commit scope:** `payments`
- **Scope:** Implement PLAN.md **P3-3**: editing re-runs allocation and increments the
  revision; voiding keeps the row and the receipt number but stops its allocations counting.
- **Acceptance:**
  - [ ] An edited receipt keeps its number and shows REVISED.
  - [ ] A voided receipt is watermarked VOID and its allocations stop counting.
  - [ ] The revision count is shown on the reprinted receipt.
- **E2E:** `payments.spec.ts` — edits a payment and asserts the receipt number is unchanged
  and the revision went up
- **Version impact:** minor

### T-053: Build the dues list and the student payment tab

- **Skill:** `senior-frontend`
- **Depends on:** T-052
- **Branch:** `feature/dues-list`
- **Commit scope:** `payments`
- **Scope:** Implement PLAN.md **P3-4**: the dues list, defaulter filters, and the Payments
  tab on the student profile.
- **Acceptance:**
  - [ ] The dues list totals match the payments module for the same range.
  - [ ] Filters by batch, class and amount range work.
  - [ ] A student with no dues is not listed.
- **E2E:** `dues.spec.ts` — filters the dues list and asserts the total
- **Version impact:** minor

### T-054: Build the receipt print route and the exports

- **Skill:** `senior-frontend`
- **Depends on:** T-052
- **Branch:** `feature/receipt-print`
- **Commit scope:** `print`
- **Scope:** Implement PLAN.md **P3-5**: the receipt print route and the Excel export.
- **Acceptance:**
  - [ ] The A5 receipt prints with correct Bangla conjuncts.
  - [ ] The receipt shows the balance due after payment and a QR code of the receipt number.
  - [ ] The Excel export opens with correct Bangla text.
- **E2E:** `receipt.spec.ts` — opens the receipt route and asserts every required field is
  present
- **Version impact:** minor

---

## Phase 4 — Academics (PLAN.md P4-1 to P4-4)

### T-060: Build the attendance session and grid

- **Skill:** `senior-frontend`
- **Depends on:** T-043
- **Branch:** `feature/attendance-grid`
- **Commit scope:** `attendance`
- **Scope:** Implement PLAN.md **P4-1**: open a session for a batch and date, mark all
  present then adjust, and show per-student and per-batch percentages.
- **Acceptance:**
  - [ ] One action marks the whole batch present.
  - [ ] Arrow keys, Enter and Tab move between cells.
  - [ ] A session is unique per batch and date.
  - [ ] Percentages match the stored records.
- **E2E:** `attendance.spec.ts` — marks all present, changes one to absent, and asserts the
  percentage
- **Version impact:** minor

### T-061: Build the exam and marks grid

- **Skill:** `senior-frontend`
- **Depends on:** T-060
- **Branch:** `feature/marks-grid`
- **Commit scope:** `exams`
- **Scope:** Implement PLAN.md **P4-2**: create an exam per batch and subject, enter marks in
  a grid, and flag absences.
- **Acceptance:**
  - [ ] Absent is a flag, not a zero.
  - [ ] The batch average updates live.
  - [ ] An exam is unique per batch, subject and date.
- **E2E:** `marks.spec.ts` — enters marks, flags one absent, and asserts the average
- **Version impact:** minor

### T-062: Implement grades and GPA

- **Skill:** `senior-backend`
- **Depends on:** T-061
- **Branch:** `feature/grades-gpa`
- **Commit scope:** `exams`
- **Scope:** Implement PLAN.md **P4-3**: grades and GPA from the settings scale.
- **Acceptance:**
  - [ ] A score of exactly 80 is an A+; 79 is an A.
  - [ ] A score below 33 is an F worth 0.
  - [ ] Changing the scale in Settings changes the grade.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** minor

### T-063: Implement ranking and the leaderboard

- **Skill:** `senior-frontend`
- **Depends on:** T-062
- **Branch:** `feature/leaderboard`
- **Commit scope:** `leaderboard`
- **Scope:** Implement PLAN.md **P4-4**: ranks per exam, per month and per academic year,
  filtered by batch or class, and printable.
- **Acceptance:**
  - [ ] Ties share a rank and the next rank skips (1, 2, 2, 4).
  - [ ] Absent students count as zero in totals and are excluded from averages.
  - [ ] Each scope filter returns the right set.
- **E2E:** `leaderboard.spec.ts` — seeds a tie and asserts the ranks are 1, 2, 2, 4
- **Version impact:** minor

---

## Phase 5 — Insight (PLAN.md P5-1 to P5-4)

### T-070: Build the dashboard

- **Skill:** `senior-frontend`
- **Depends on:** T-063, T-053
- **Branch:** `feature/dashboard`
- **Commit scope:** `dashboard`
- **Scope:** Implement PLAN.md **P5-1**: collection vs due, admissions, active students,
  today's batches, low-attendance students, recent toppers and the backup health warning.
- **Acceptance:**
  - [ ] The KPI numbers match the payments and students modules for the same range.
  - [ ] Each KPI is a link to the filtered list behind it.
  - [ ] The backup health banner appears when the last export is stale.
- **E2E:** `dashboard.spec.ts` — asserts each KPI value against the module behind it
- **Version impact:** minor

### T-071: Build the reports framework

- **Skill:** `senior-frontend`
- **Depends on:** T-070
- **Branch:** `feature/reports-framework`
- **Commit scope:** `reports`
- **Scope:** Implement PLAN.md **P5-2**: a filter bar, a preview, a print view, and Excel and
  CSV exports that use the filters shown.
- **Acceptance:**
  - [ ] The export contains exactly the rows in the preview.
  - [ ] The CSV opens in Excel with correct Bangla text.
  - [ ] The print view uses the A4 `@page` layout.
- **E2E:** `reports.spec.ts` — filters a report, exports, and asserts the export matches the
  preview
- **Version impact:** minor

### T-072: Implement every report in the catalogue

- **Skill:** `senior-backend`
- **Depends on:** T-071
- **Branch:** `feature/report-catalogue`
- **Commit scope:** `reports`
- **Scope:** Implement PLAN.md **P5-3**: student list, admissions, payment register, dues,
  receipts by date range, attendance, result sheets and the admin report.
- **Acceptance:**
  - [ ] Every report in `FRONTEND_SPEC.md` §5.8 exists and is filterable.
  - [ ] Report totals equal the sums shown in the payments and students modules for the same
        range.
- **E2E:** `reports.spec.ts` — asserts each report total against the module behind it
- **Version impact:** minor

### T-073: Implement the admin report

- **Skill:** `senior-backend`
- **Depends on:** T-072
- **Branch:** `feature/admin-report`
- **Commit scope:** `reports`
- **Scope:** Implement PLAN.md **P5-4**: the monthly and per-academic-year admin report, with
  exports as PDF (print) and Excel.
- **Acceptance:**
  - [ ] Admissions, drop-outs, collected, dues, method split, attendance rate, top
        performers and net are all present.
  - [ ] The totals equal the payments and students modules for the same range.
  - [ ] The report prints on A4 and exports to Excel.
- **E2E:** `admin-report.spec.ts` — asserts the collected figure against the payment register
- **Version impact:** minor

---

## Phase 6 — Hardening (PLAN.md P6-1 to P6-5)

### T-080: Add the PIN lock and roles

- **Skill:** `senior-backend`
- **Depends on:** T-073
- **Branch:** `feature/pin-and-roles`
- **Commit scope:** `auth`
- **Scope:** Implement PLAN.md **P6-1**: a PBKDF2-hashed admin PIN, an inactivity lock, and
  the Admin, Accountant and Teacher roles enforced in services.
- **Acceptance:**
  - [ ] The PIN is stored as a PBKDF2 hash with a per-user salt, never in plain text.
  - [ ] The lock screen appears after the inactivity timeout.
  - [ ] A Teacher cannot write a payment, proved by a service-level test.
  - [ ] A permission denied by the UI is also refused by the service.
- **E2E:** `auth.spec.ts` — locks the app and asserts the lock screen, then unlocks with the
  PIN
- **Version impact:** minor

### T-081: Build the import tools with a dry run

- **Skill:** `senior-backend`
- **Depends on:** T-080
- **Branch:** `feature/import-tools`
- **Commit scope:** `data-tools`
- **Scope:** Implement PLAN.md **P6-2**: CSV and Excel import for students, batches,
  enrollments and marks, with a template, column mapping, validation preview and a dry run.
- **Acceptance:**
  - [ ] Row-level errors are shown before anything is written.
  - [ ] A dry run changes nothing.
  - [ ] Importing the same file twice does not duplicate students.
  - [ ] A pre-import snapshot is taken before the commit.
- **E2E:** `import.spec.ts` — uploads a file with one bad row and asserts the preview flags it
  and nothing is written
- **Version impact:** minor

### T-082: Build the audit log viewer

- **Skill:** `senior-frontend`
- **Depends on:** T-081
- **Branch:** `feature/audit-viewer`
- **Commit scope:** `audit`
- **Scope:** Implement PLAN.md **P6-3**: a filterable table of every change, with the before
  and after rows.
- **Acceptance:**
  - [ ] Every change is listed with its entity, action and timestamp.
  - [ ] The filters narrow by entity, action and date range.
  - [ ] The before and after snapshots are viewable.
- **E2E:** `audit-viewer.spec.ts` — makes a change and asserts it appears in the viewer
- **Version impact:** minor

### T-083: Run the performance pass

- **Skill:** `senior-backend`
- **Depends on:** T-082
- **Branch:** `feature/performance-pass`
- **Commit scope:** `repo`
- **Scope:** Implement PLAN.md **P6-4**: verify the budgets with 5,000 students, 60,000
  payments and 200,000 marks, and fix what misses them.
- **Acceptance:**
  - [ ] The student list and search complete in under 100 ms.
  - [ ] Every report completes in under 2 s at 60,000 payments.
  - [ ] The initial JavaScript stays under 300 KB gzipped.
- **E2E:** n/a — measured by a script, not a spec
- **Version impact:** patch

### T-084: Run the accessibility and Bangla review

- **Skill:** `senior-frontend`
- **Depends on:** T-083
- **Branch:** `feature/accessibility-review`
- **Commit scope:** `ui`
- **Scope:** Implement PLAN.md **P6-5**: every screen in `FRONTEND_SPEC.md` §8, with a human
  review of the Bangla strings.
- **Acceptance:**
  - [ ] Every screen passes the keyboard-only walkthrough.
  - [ ] Every input has a bound label.
  - [ ] Contrast meets AA in both themes.
  - [ ] The layout has no horizontal scroll at 360px.
  - [ ] A human has reviewed the Bangla strings.
- **E2E:** `a11y.spec.ts` — tab-walks the main screens and asserts the focus ring and the
  order
- **Version impact:** patch

---

## Phase 7 — Release (PLAN.md P7-1 to P7-3)

### T-090: Write the end-to-end scenarios

- **Skill:** `senior-frontend`
- **Depends on:** T-084
- **Branch:** `test/end-to-end-scenarios`
- **Commit scope:** `e2e`
- **Scope:** Implement PLAN.md **P7-1**: admission to payment to receipt to backup to
  restore, as one committed spec.
- **Acceptance:**
  - [ ] The spec performs the whole journey and asserts each outcome.
  - [ ] The spec runs in CI against the production build.
  - [ ] No file in `e2e/` exceeds 300 LOC.
- **E2E:** `full-journey.spec.ts` — the whole journey, from admission to restore
- **Version impact:** none

### T-091: Write the in-app user guide

- **Skill:** `frontend-design`
- **Depends on:** T-090
- **Branch:** `feature/user-guide`
- **Commit scope:** `docs`
- **Scope:** Implement PLAN.md **P7-2**: a short guide in the app, in English and Bangla.
- **Acceptance:**
  - [ ] The guide is reachable from the sidebar.
  - [ ] Every string exists in both languages.
  - [ ] The guide is reachable offline.
- **E2E:** `user-guide.spec.ts` — opens the guide and asserts both language tabs exist
- **Version impact:** minor

### T-092: Ship the production build

- **Skill:** `senior-backend`
- **Depends on:** T-091
- **Branch:** `chore/release-preparation`
- **Commit scope:** `release`
- **Scope:** Implement PLAN.md **P7-3**: the production build, static hosting instructions,
  and a version stamp in Settings.
- **Acceptance:**
  - [ ] The version in Settings matches `package.json`.
  - [ ] The hosting instructions are in `README.md`.
  - [ ] The security headers in `public/_headers` are documented.
  - [ ] A fresh clone builds and passes the full suite.
- **E2E:** n/a — no UI/user-visible behavior
- **Version impact:** minor

---

## Not yet ticketed

PLAN.md **P8** is explicitly optional and is not scheduled: WhatsApp or SMS link reminders,
ID cards, admit cards, marksheets, expense tracking, year-end promotion, the programmatic PDF
spike, and the Tauri desktop wrapper. Each becomes a ticket only when the human asks for it.
