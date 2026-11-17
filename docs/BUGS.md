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

## BUG-004: The app cannot load offline — SQLite WASM is not precached

- **Status:** open
- **Severity:** high
- **Found:** 2026-11-17 (during: full-suite e2e verification after T-041)
- **Location:** `vite.config.ts` (`workbox.globPatterns` and `runtimeCaching`); `e2e/specs/offline.spec.ts`
- **Description:** After one online visit, going offline and reloading shows the recovery screen with `Aborted(NetworkError: Failed to execute 'send' on 'XMLHttpRequest': Failed to load '.../assets/sqlite3-*.wasm')`. Expected: the dashboard loads and the Settings route works offline. `globPatterns` is `**/*.{js,css,html,svg,png,woff2}` — no `wasm` — and every runtime URL is `NetworkOnly`, so the sqlite-wasm binary is never available without a network. Reproduces on `dev` unchanged by T-041; the config was set in T-019.
- **Root Cause:** the Workbox precache glob omits the `.wasm` asset and no runtime cache stores it.
- **Fix Approach:** add `wasm` to the precache glob (and consider a runtime cache for the WASM binary), then re-run `offline.spec.ts`; a fix must include a regression assertion that the WASM request succeeds while offline. Not fixed in T-041 — different ticket, and the approach follows the confirmation protocol.
- **Resolved:** —

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

- **Status:** open
- **Severity:** low
- **Found:** 2026-11-17 (during: full-suite e2e verification after T-041)
- **Location:** `e2e/specs/offline.spec.ts:53`; `src/modules/settings/SettingsScreen.tsx`
- **Description:** `the Settings screen shows the storage persistence status` fails because it looks for `getByTestId('persistence-status')`, which no element renders. T-040 replaced the T-019 status row with a plain paragraph that has no test id. Expected: the spec targets the current status element. Reproduces on `dev`; `git show origin/dev:src/modules/settings/SettingsScreen.tsx` has no `persistence-status`.
- **Root Cause:** the T-040 Settings rewrite changed the markup without updating the T-019 spec.
- **Fix Approach:** either restore a `data-testid="persistence-status"` on the status paragraph or retarget the spec to the current accessible text; add/keep a regression assertion. Not fixed in T-041 (separate ticket).
- **Resolved:** —

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

_None._

## Won't fix

_None._
