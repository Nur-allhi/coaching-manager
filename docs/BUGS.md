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
