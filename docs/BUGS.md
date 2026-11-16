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

## BUG-001: Stray Git conflict marker in the decisions log

- **Status:** open
- **Severity:** low
- **Found:** 2026-11-16 (during: autonomous nightly build — reading docs before T-019)
- **Location:** `docs/DECISIONS.md` — between D-029 and D-028 (line 330 after D-032 was added; was 310 when found)
- **Description:** A leftover conflict marker line (`> > > > > > > 77a1efe …`) sits between
  D-029 and D-028 in the committed decisions log. Expected: a clean Markdown document with no
  conflict markers. Present in `dev` at `41afdfd`; breaks the rendered log between two entries.
- **Root Cause:** unknown until diagnosed
- **Fix Approach:**
- **Resolved:**

## In progress

_None._

## Fixed

_None._

## Won't fix

_None._
