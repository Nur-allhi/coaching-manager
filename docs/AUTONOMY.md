# AUTONOMY — Autonomous build mode

**Status:** live · **Target skill:** `code-reviewer` · **Enforced by:** the nightly scheduled session

How the agent works when the human is asleep. This document owns the autonomous-mode rules;
[`REPO_RULES.md`](REPO_RULES.md) owns the normal interactive rules and links here for the
exceptions. When the two conflict, this document wins **only** while `AUTONOMOUS_MODE` is set.

---

## 1. When this mode applies

A run is autonomous only when its prompt or environment sets `AUTONOMOUS_MODE=true`. Every
scheduled overnight task sets it. An ordinary conversation with the human never does.

**One run at a time.** Before building, check whether another autonomous session is active. If
one already is, end immediately with a status block saying so — do not start a second builder.
Two sessions in one checkout corrupt work; this is why a human double-trigger once caused
bug BUG-002. Never call `schedule.run` twice, and never create a duplicate scheduled task.

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
   loop re-run, up to the retry limit in §5.
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

## 5. Failure, retry and run limits

1. A failed command or check is retried up to **3** times. On a transient cause (runner restart,
   GraphQL error, overloaded inference, CI still pending) retry before logging anything.
2. If it still fails, log a BUG in `docs/BUGS.md` with the error and the step, mark the ticket
   blocked in `docs/PROGRESS.md`, and move to the next ticket. Never loop forever on one ticket.
3. **Merge conflicts** are mechanical: fetch `dev`, merge it into the working branch with a normal
   merge commit (never rebase a pushed branch, never force-push), resolve keeping both sides,
   re-run checks, push, re-wait CI, then merge. A conflict is not a blocker.
4. **Token limit or a stop signal:** finish the current ticket if it is commit-ready, push the
   branch, write the session log, then output the final status block and end the run. A later run
   resumes at the next ticket. Do not start a new ticket when the budget is near exhaustion.
5. **Memory pressure:** `tsc -b` can segfault and a full Playwright run can be killed. Use
   `NODE_OPTIONS=--max-old-space-size=6144` for `pnpm check`, run the E2E suite in halves with
   `--workers=1`, and clean stale `vite preview` processes on port 4173 before a run. A crash is
   infrastructure, not a product bug — retry, then log only if it repeats.
6. **Run cap:** one scheduled run completes at most **six tickets**. After the sixth merged PR,
   end the run with the status block even if tokens remain. The next hourly run continues.
7. **Stop signals from the human** (a prompt delivered to the session) take priority: finish the
   current ticket, then end. Never spawn a replacement session to keep working.

## 6. Safety line

Autonomy ends at `dev`. `main`, releases, version tags, branch protection, secrets and the
test matrix are never touched without a human. The human reviews the morning's `dev` history.
