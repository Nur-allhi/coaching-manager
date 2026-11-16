# AUTONOMY — Autonomous build mode

**Status:** live · **Target skill:** `code-reviewer` · **Enforced by:** the nightly scheduled session

How the agent works when the human is asleep. This document owns the autonomous-mode rules;
[`REPO_RULES.md`](REPO_RULES.md) owns the normal interactive rules and links here for the
exceptions. When the two conflict, this document wins **only** while `AUTONOMOUS_MODE` is set.

---

## 1. When this mode applies

A run is autonomous only when its prompt or environment sets `AUTONOMOUS_MODE=true`. Every
scheduled overnight task sets it. An ordinary conversation with the human never does.

## 2. Decision protocol in autonomous mode

1. The agent follows `REPO_RULES.md` §1.1 in full: surface at least two genuinely viable options
   with concrete trade-offs and a lean, even though no human is present to answer.
2. It **then decides itself** by taking its own stated lean, unless the choice falls under §3.
3. Every autonomous decision MUST be written to `docs/DECISIONS.md` in the normal format,
   with the phrase "Autonomous decision" and the ticket id, before the code that depends on it.
4. A decision the agent is not able to make honestly (no viable option, or two rules truly
   conflict with no safe default) stops the ticket: log a BUG and move to the next ticket.

## 3. Decisions the agent may NOT make autonomously

These remain human-only even overnight. If a ticket needs one, skip it, log a BUG explaining
what is blocked, and continue with the next ticket:

1. Anything that changes a **Locked Decision** in `PLAN.md` §3, the schema conventions in §6,
   or the backup/restore behaviour in §7.3.
2. Any merge into `main`, a release, a version bump, or a version tag.
3. Deleting a branch, force-pushing, or rewriting shared history.
4. Adding or changing a credential, secret, CI permission, or branch-protection setting.
5. Removing Safari/browser targets or changing the test matrix (D-026 was a human call).

## 4. The autonomous ticket loop

For each ticket, in the order of `docs/TICKETS.md` whose dependencies are met and that is not
blocked by §3:

1. **Branch** — `branch-manager` from `dev` (hotfix from `main`, which is §3-blocked overnight).
2. **Implement** — read the ticket, phase and module spec; run GitNexus impact before edits.
3. **Verify** — `e2e-tester` runs the MCP workflow and writes specs; `pnpm check` and `pnpm e2e`
   must both pass.
4. **Review** — `code-reviewer` and `security-auditor` must both PASS. A FAIL is fixed and the
   loop re-run, up to the retry limit in §6.
5. **Commit** — `commit-writer`, Conventional Commit, atomic.
6. **PR** — `branch-manager` opens a PR into `dev`.
7. **Auto-merge** — allowed **only** when all of the following are true:
   - both required CI checks are green (`Typecheck, lint, unit tests, build` and
     `End-to-end (Chromium)`),
   - the branch is up to date with `dev`,
   - both reviews from step 4 are PASS,
   - the PR changes no file listed in §3.
     Then squash-merge into `dev`. Never merge into `main`.
8. **Housekeeping** — `session-logger` appends the session line; `bug-tracker` logs any bug at
   the moment it is found; `CHANGELOG.md` and `docs/PROGRESS.md` are updated in the PR.

## 5. Failure and retry

1. A failed command or check is retried up to **3** times with the same approach.
2. If it still fails, log a BUG in `docs/BUGS.md` with the error and the step that failed,
   mark the ticket as blocked, and move to the next ticket. Never loop forever on one ticket.
3. A flaky infrastructure failure (runner restart, transient GraphQL error) is retried before a
   bug is logged; note the retry in the session log.
4. The nightly task stops cleanly when its token budget is exhausted, leaving the tree clean
   and any in-flight branch pushed for the next run to pick up.

## 6. Safety line

Autonomy ends at `dev`. `main`, releases, version tags, branch protection, secrets and the
test matrix are never touched without a human. The human reviews the morning's `dev` history.
