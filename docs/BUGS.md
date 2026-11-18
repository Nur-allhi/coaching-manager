# BUGS — Bug Tracker

**Status:** live · **Target skill:** `code-reviewer`

The living queue of known issues — open, in progress, fixed, or won't fix. Every bug is logged
here **before** anything else happens with it, per
[`REPO_RULES.md`](REPO_RULES.md) §10.

This file is not `session_log.md` (session history) and not `CHANGELOG.md` (shipped changes).
It is the queue of things that are known to be wrong.

---

## Entry format

```
## BUG-<sequential-id>: <short title>

- **Status:** open | in-progress | fixed | wontfix
- **Severity:** critical | high | medium | low
- **Found:** YYYY-MM-DD (during: <what surfaced it>)
- **Location:** <file(s)/component/route affected>
- **Description:** What's wrong, observed vs expected. For test-found bugs, the trace or
  screenshot path.
- **Root Cause:** unknown until diagnosed
- **Fix Approach:** filled in only after the human confirmed it
- **Resolved:** YYYY-MM-DD — commit/PR reference
```

## Ordering

The file is maintained in this order, always:

1. **Status** first — `open` and `in-progress` above `fixed` and `wontfix`.
2. Then **severity** — `critical`, `high`, `medium`, `low`.
3. Then **found date**, oldest first.

`fixed` and `wontfix` entries stay in the file and move to the bottom, so this file doubles as
a resolved-bug history.

---

## Open

## BUG-015: Enrollment form still says "(paisa)" and money inputs have no unit hint

- **Status:** fixed
- **Severity:** low
- **Found:** 2026-11-18 (user feedback on `/enrollments` at 1462×788)
- **Location:** `src/core/i18n/locales/en.ts:102-103`, `bn.ts:107-108` (labels);
  `src/modules/enrollments/EnrollmentFormFields.tsx` (numeric inputs)
- **Description:** after the whole-taka change (D-068), the admission-fee and monthly-fee labels
  still read "(paisa)" / "(পয়সা)", and the numeric inputs show a bare number with no unit, so it
  is not obvious the value is money. Expected: labels name taka/BDT and the numeric fields carry a
  small, non-blocking unit hint next to the number.
- **Root Cause:** the money-unit conversion updated helpers, fixtures and governing docs but missed
  these labels and the form fields.
- **Fix Approach:** labels now say "(BDT)" / "(বিডিটি)"; money inputs carry a small muted unit
  suffix inside the field ("BDT", or "%" when the discount kind is percent); the live net-fee
  preview shows the unit too. Used the existing `Input`, `Label` and muted-foreground token, no new
  dependency. The unit suffix is `aria-hidden` because the label already names the unit for screen
  readers.
- **Resolved:** 2026-11-18 — uncommitted follow-up to D-068 on `dev`

## BUG-014: Enrollments screen shows fees in paisa instead of taka

- **Status:** fixed
- **Severity:** medium
- **Found:** 2026-11-18 (during: user testing with the demo dataset)
- **Location:** `src/modules/enrollments/EnrollmentsScreen.tsx:158` (form preview) and `:182` (list row)
- **Description:** Both places rendered `discountedMonthlyFee(...)` directly, so a 1500-taka
  monthly fee was shown as `150000`.
- **Root Cause:** two renders skipped the money formatter, and the app's stored unit was paisa.
- **Fix Approach:** the human chose the broader fix — redefine all money as whole taka (D-068).
  Both renders now call `formatMinor`; helpers, migration, fixtures and governing docs were
  updated to the taka convention. Verified with unit and E2E tests showing formatted taka.
- **Resolved:** 2026-11-18 — whole-taka conversion on `dev` (no release)

## BUG-012: Inactivity-lock E2E is flaky across browsers

- **Status:** fixed
- **Severity:** low
- **Found:** 2026-11-18 (during: full-suite e2e verification for T-082)
- **Location:** `e2e/specs/auth.spec.ts:75-83`, `src/core/auth/session.ts` (`startIdleWatcher`)
- **Description:** "locks after the inactivity timeout" intermittently reports `getByTestId('lock-title')` not found within 10 s after setting `IDLE_KEY` to `0.02`. In three local runs the failing browser varied (Chromium twice, Firefox once on clean `dev`); the other browser passed. Reproduced on unmodified `dev` in a detached worktree, so it is not a T-082 regression. T-080's CI was green with its two automatic retries.
- **Root Cause:** the 1 s interval in `startIdleWatcher` called `noteActivity()`, which refreshed
  `lastActivityAt` on every tick as long as the timeout had not elapsed. With the test's 1.2 s
  timeout, locking depended on where the ticks landed relative to the last activity; a real
  10-minute idle session never auto-locked at all.
- **Fix Approach:** the human chose to fix the watcher. A new `checkIdle()` locks when the timeout
  has elapsed without touching the activity clock; the interval uses it while real
  `pointerdown`/`keydown` events still call `noteActivity()` to refresh. A unit regression drives
  660 one-second ticks with no activity and fails before / passes after. The existing E2E spec is
  unchanged and now passes reliably in Chromium and Firefox.
- **Resolved:** 2026-11-18 — branch `fix/idle-lock-e2e` (PR pending)

## BUG-004: The app cannot load offline — SQLite WASM is not precached

- **Status:** fixed
- **Severity:** high
- **Found:** 2026-11-17 (during: full-suite e2e verification after T-041)
- **Location:** `vite.config.ts` (`workbox.globPatterns` and `runtimeCaching`); `e2e/specs/offline.spec.ts`
- **Description:** After one online visit, going offline and reloading shows the recovery screen with `Aborted(NetworkError: Failed to execute 'send' on 'XMLHttpRequest': Failed to load '.../assets/sqlite3-*.wasm')`. Expected: the dashboard loads and the Settings route works offline. `globPatterns` is `**/*.{js,css,html,svg,png,woff2}` — no `wasm` — and every runtime URL is `NetworkOnly`, so the sqlite-wasm binary is never available without a network. Reproduces on `dev` unchanged by T-041; the config was set in T-019.
- **Root Cause:** the Workbox precache glob omits the `.wasm` asset and no runtime cache stores it.
- **Fix Approach:** added `wasm` to the Workbox precache glob in `vite.config.ts`; the existing `offline.spec.ts` offline-reload test is the regression assertion. Confirmed by the human.
- **Resolved:** 2026-11-17 — fix branch `fix/offline-specs`

## BUG-006: Restoring a pre-T-042 snapshot leaves the new students schema absent

- **Status:** open
- **Severity:** medium
- **Found:** 2026-11-17 (during: code review of T-042, triggered by the new FTS5/photo migration)
- **Location:** `src/core/backup/restore.ts:112` (`importBytes` is not followed by `migrate`),
  `src/core/backup/file-transfer.ts`
- **Description:** `restoreFromSnapshot` validates that the snapshot schema is not newer than the
  app, then imports the bytes without re-running migrations. After restoring a snapshot taken
  before migration `202611171000` in the same running app, `students_fts` and the `photo` column
  do not exist, so student FTS search throws "no such table" and photo writes fail. A manual page
  reload (which runs bootstrap migrations) recovers. PLAN.md §7.3 lists "run migrations if the
  snapshot is older, reload the app" as part of the restore flow; the implementation omits it.
- **Root Cause:** the restore path does not re-run pending migrations after `importBytes`.
- **Fix Approach:** run `migrate({ db, migrations })` after a successful import (and for file
  import), or reload the app. **Deferred:** this changes backup/restore behaviour in PLAN.md §7.3,
  which is human-only under AUTONOMY.md §3.1; a human must confirm the approach.
- **Resolved:** —

## BUG-005: Offline spec asserts a test id the Settings screen no longer renders

- **Status:** fixed
- **Severity:** low
- **Found:** 2026-11-17 (during: full-suite e2e verification after T-041)
- **Location:** `e2e/specs/offline.spec.ts:53`; `src/modules/settings/SettingsScreen.tsx`
- **Description:** `the Settings screen shows the storage persistence status` fails because it looks for `getByTestId('persistence-status')`, which no element renders. T-040 replaced the T-019 status row with a plain paragraph that has no test id. Expected: the spec targets the current status element. Reproduces on `dev`; `git show origin/dev:src/modules/settings/SettingsScreen.tsx` has no `persistence-status`.
- **Root Cause:** the T-040 Settings rewrite changed the markup without updating the T-019 spec.
- **Fix Approach:** restored `data-testid="persistence-status"` on the persistence paragraph in the real Settings screen; the existing spec is the regression assertion. Confirmed by the human.
- **Resolved:** 2026-11-17 — fix branch `fix/offline-specs`

## BUG-007: Undoing a photo update can write a redaction marker into the BLOB column

- **Status:** open
- **Severity:** low
- **Found:** 2026-11-17 (during: code review of T-042)
- **Location:** `src/core/audit/undo.ts:58-68,89-94`; `src/core/audit/write.ts:38-40`;
  `src/modules/students/StudentProfile.tsx`
- **Description:** Audit snapshots now redact `Uint8Array` to `<blob:N bytes>` (so photos do not
  expand into per-byte JSON). `undoWithin` builds its inverse patch from the stored `before_json`,
  so undoing a photo-only update would write that literal marker string into the `photo` BLOB.
  The previous code could not undo photo updates either (binding a per-byte object failed), so
  this is a pre-existing limitation made safe-but-imprecise, not a new regression.
- **Root Cause:** the undo path reconstructs values from JSON snapshots that intentionally omit
  binary content.
- **Fix Approach:** represent blobs by a typed marker that undo translates back to the stored
  bytes (or exclude binary-only entries from undo), with a regression test. Needs the human's
  confirmation under REPO_RULES.md §10 before a fix.
- **Resolved:** —

## BUG-008: Dev/test harness routes are reachable in production builds

- **Status:** open
- **Severity:** low
- **Found:** 2026-11-17 (during: security review of T-043, which adds `/__enrollment-fixture`)
- **Location:** `src/app/router.ts` (all `/__*` routes, including the new enrollment fixture)
- **Description:** The `/__*` harness routes are mounted unconditionally, so a production build
  exposes buttons that write seed/fixture rows to the real OPFS database. No real data is read or
  leaked; the risk is unwanted writes by anyone who opens the URL. The new enrollment fixture adds
  one more instance of an existing pattern (T-025/D-025 explicitly keep harnesses built so the
  production-preview E2E can reach them — a `import.meta.env.DEV` gate would break every E2E spec).
- **Root Cause:** harness routes share the router with product routes and are not feature-gated;
  gating them requires changing the verified E2E strategy for every module.
- **Fix Approach:** decide on a single cross-cutting approach (e.g. a build flag that the E2E build
  sets explicitly) and apply it to all harness routes with a regression test. Needs a human
  decision because it changes the established verification strategy. Deferred from T-043.
- **Resolved:** —

## BUG-002: Duplicate concurrent nightly autonomous-build sessions

- **Status:** wontfix
- **Severity:** medium
- **Found:** 2026-11-16 (during: autonomous nightly build — checking git status before T-020)
- **Location:** OpenChamber scheduled task 'Coaching Manager — autonomous nightly build'; session
  state. Not a product-code file.
- **Description:** Two top-level sessions titled 'Coaching Manager — autonomous nightly build'
  (started 22:47 and 22:49 Asia/Dhaka) were busy at the same time on 2026-11-16, while the
  scheduler reports only one enabled task (16fa9d08-…, daily 22:00) with `lastSessionId` set to
  the 22:49 run. Both shared the same checkout at
  /home/homelab/dev_projects/coaching-center-manager; the 22:47 session was already implementing
  T-019 there while the 22:49 session (the scheduled one) started T-020. Expected: one nightly
  session per trigger. Actual: two concurrent builders editing the same working tree, which
  forced the scheduled run to move into an isolated git worktree to avoid corrupting files. One
  session may perform work the other duplicated.
- **Root Cause:** the human triggered `schedule.run` twice in a row during the manual dry run;
  the scheduler created one session per manual trigger. Not a scheduler defect — the nightly
  cron fires once per day.
- **Fix Approach:** none needed; avoid double-triggering. The scheduled task is now disabled
  until the dry-run review is complete.
- **Resolved:** 2026-11-17 — marked wontfix as a one-off trigger mistake, not a product defect

## BUG-001: Stray Git conflict marker in the decisions log

- **Status:** fixed
- **Severity:** low
- **Found:** 2026-11-16 (during: autonomous nightly build — reading docs before T-019)
- **Location:** `docs/DECISIONS.md` — between D-029 and D-028 (line 330 after D-032 was added; was 310 when found)
- **Description:** A leftover spaced conflict-marker line (seven `>` characters, then the
  commit `77a1efe …`) sat between D-029 and D-028 in the committed decisions log. Expected: a
  clean Markdown document with no conflict markers. Present in `dev` at `41afdfd`; broke the
  rendered log between two entries.
- **Root Cause:** a spaced form of a Git conflict marker left by a manual rebase conflict
  resolution earlier in the session; the later conflict-marker grep used the unspaced form and
  missed it.
- **Fix Approach:** remove the stray line; add a regression test that scans the governing docs
  for both spaced and unspaced conflict markers. Confirmed by the human during dry-run cleanup.
- **Resolved:** 2026-11-17 — fix commit on `dev`

## BUG-003: Dev snapshot harness overflows horizontally on narrow viewports

- **Status:** fixed
- **Severity:** low
- **Found:** 2026-11-16 (during: T-031 e2e verification at 375px viewport)
- **Location:** `src/app/dev/SnapshotHarness.tsx` (the `<p data-testid="last-sidecar">` element renders an unsplit JSON string)
- **Description:** At a 375px viewport the dev-only `/__snapshots` verification harness overflows horizontally because the last-sidecar JSON is one long unbroken string. Expected: no horizontal scroll at phone width. Observed: horizontal overflow at 375px (1075px). Dev/test route (D-025 precedent), not product UI.
- **Root Cause:** the sidecar is rendered via `JSON.stringify` with no wrapping rule. The default `overflow-wrap: normal` never breaks an unbroken token, so the long JSON string forced the document wider than the viewport.
- **Fix Approach:** add Tailwind `wrap-anywhere` (`overflow-wrap: anywhere`) to the sidecar element; add a regression spec that takes a snapshot at 375px and asserts zero document overflow. Confirmed by the human.
- **Resolved:** 2026-11-17 — fix branch `fix/bug-003-harness-overflow`

## In progress

_None._

## Fixed

## BUG-009: Dues report overflows horizontally at phone and tablet widths

- **Status:** fixed
- **Severity:** medium
- **Found:** 2026-11-17 (during: T-053 browser verification at 375px and 768px)
- **Location:** `src/modules/payments/DuesScreen.tsx` (the dues report grid)
- **Description:** At a 375px viewport the `/payments/dues` report made `document.scrollWidth`
  exceed `innerWidth` by 167px (82px at 768px after the first attempt); at 1280px overflow was 0.
  Expected: no horizontal document scroll at phone width (FRONTEND_SPEC §8 / REPO_RULES §7.6).
- **Root Cause:** five fixed rem columns could not shrink; at 768px an added `min-w-[34rem]` also
  forced the sidebar's flex content column wider than the remaining viewport.
- **Fix Approach:** replace the fixed columns with `grid-cols-[5rem_minmax(0,1fr)_4rem_4rem_4rem]`
  and `truncate` the text cells, so the grid shrinks to the available width instead of pushing the
  document wider. A `dues.spec.ts` regression asserts zero document overflow at 375px. Verified at
  375/768/1280px: 0px overflow and 0 console errors on each (screenshots `/tmp/opencode/dues-*.png`).
- **Resolved:** 2026-11-17 — T-053 branch `feature/dues-list`

## BUG-010: Opening an attendance session writes two create audit rows

- **Status:** fixed
- **Severity:** medium
- **Found:** 2026-11-17 (during: T-061 code review, while checking the shared audit helper)
- **Location:** `src/modules/attendance/repository.ts` (`getOrCreateSession`)
- **Description:** `repoWithin(t, ctx).insert('attendance_sessions', ...)` already writes a `create`
  audit row through the shared `insertWithin` helper, but `getOrCreateSession` then called
  `writeAudit(...)` again with the same entity and action. Opening a new session therefore produced
  two `create` rows in `audit_log` instead of one. Expected one audit row per write (REPO_RULES §7 /
  TAD §5.1). The pre-existing attendance tests only asserted that the audit count grows for a status
  change, so they did not catch it.
- **Root Cause:** the module repository duplicated the audit write the shared insert helper already
  performs in the same transaction.
- **Fix Approach:** removed the redundant manual `writeAudit` call and its now-unused import; the
  shared helper's `create` row (which carries the full inserted row) is kept. A regression test
  asserts exactly one `create` row for the session and fails before / passes after the change.
  Confirmed by the human.
- **Resolved:** 2026-11-17 — fix branch `fix/duplicate-session-audit`

## BUG-011: Opening /exams/:id for a missing exam logs "Query data cannot be undefined"

- **Status:** fixed
- **Severity:** low
- **Found:** 2026-11-17 (during: autonomous run — known issue handed over before T-062)
- **Location:** `src/modules/exams/MarksGrid.tsx` (the `exam` `useQuery` queryFn);
  `src/modules/exams/service.ts` (`getExam`); `src/modules/exams/repository.ts` (`getExam`)
- **Description:** Navigating to `/exams/:id` for an id that does not exist (stale bookmark, or an
  exam soft-deleted after the link was saved) makes `getExam` resolve to `undefined`. TanStack
  Query v5.107.1 treats `undefined` as an invalid success value: it logs
  `Query data cannot be undefined. Please make sure to return a value other than undefined from your query function...`
  to `console.error`, then throws. Expected: a missing exam is an honest "not found" state with a
  retry action (REPO_RULES §7.6 #18 four async states), and the query function never resolves to
  `undefined`. The grid currently renders no error state, so the user sees a blank grid plus a
  console error. Normal (existing-exam) routes are unaffected; no data is at risk.
- **Root Cause:** the `exam` query function returns the raw `getExam` result, whose type is
  `Promise<ExamRow | undefined>`; a `SELECT` with no row yields `rows[0] === undefined`.
- **Fix Approach:** an additive `loadExam` loader in the exams service converts the missing row
  into a typed `ExamNotFoundError`; `MarksGrid` uses it as its query function (`retry: false`,
  unexpected errors thrown to the boundary) and renders loading / not-found + retry states from
  new en/bn `exams.notFound` / `exams.retry` keys. Decided autonomously in D-053. Regression
  coverage: a component test that fails before the fix (no alert + the console error) and passes
  after, a service unit test for the typed error, and an `marks.spec.ts` browser assertion of the
  not-found state with zero undefined-data console errors.
- **Resolved:** 2026-11-17 — fix branch `fix/missing-exam-not-found`

## BUG-013: Import accepts invalid student statuses and has leaked English in Bangla

- **Status:** fixed
- **Severity:** medium
- **Found:** 2026-11-18 (during: review of the T-081 import work)
- **Location:** `src/modules/data-tools/import/validate.ts`, `src/core/i18n/locales/import.{en,bn}.ts`
- **Description:** The validator accepted `active|inactive|left`, but students stores
  `active|dropped|passed_out`, so an imported `left` row got an unrenderable status. The Bangla
  `badStudentNo` contained the English word "like", `kind` read "ক আমদানি করবেন", and `badStatus`
  named the wrong vocabulary.
- **Root Cause:** validator written against an assumed status vocabulary; untranslated tokens.
- **Fix Approach:** aligned the validator and both status messages with the students enum and
  corrected the Bangla tokens; decided under D-064 D1 as part of T-084. `pnpm check` and the
  import/a11y E2E specs cover it.
- **Resolved:** 2026-11-18 — `feature/accessibility-review`

## Won't fix

_None._
