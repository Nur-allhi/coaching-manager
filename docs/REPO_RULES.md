# REPO_RULES — Repository Management

**Status:** live · **Target skill:** `gitnexus` · **Enforced by:** `code-reviewer`

Every merge and housekeeping action, for the lifetime of this project. Branching, commits and
versioning have their own documents and their own rules:

| Document                               | Holds                                             |
| -------------------------------------- | ------------------------------------------------- |
| [`BRANCHING.md`](BRANCHING.md)         | Branch types, lifecycle, protection, PR template. |
| [`COMMIT_SYSTEM.md`](COMMIT_SYSTEM.md) | Commit format, types, allowed scopes.             |
| [`VERSIONING.md`](VERSIONING.md)       | SemVer, the version source of truth, releases.    |

---

## 1. Decision-making and confirmation protocol

These rules govern how any change is proposed and executed in a normal, interactive session.
A scheduled run with `AUTONOMOUS_MODE=true` follows [`AUTONOMY.md`](AUTONOMY.md) instead; that
document owns the exceptions for deciding, merging and fixing without a human present.

### 1.1 Discuss before deciding

1. Whenever a choice exists — architecture, library, pattern, data model, naming, UI approach,
   tooling — the agent MUST NOT silently pick one.
2. The agent MUST surface the choice, explain the trade-offs, and let the human choose.
3. The agent MUST present at least **two refined, genuinely viable options**. A strawman
   against a favourite is not an option.
4. For each option the agent MUST state: what it is, why it could be the right call, its main
   downside or cost, and which the agent would lean toward and why.
5. Comparisons MUST be concrete: performance, complexity, maintainability, time to build, LOC
   impact, dependency footprint. "Cleaner" is not a factor.

### 1.2 Confirmation gate

1. No file may be created, edited or deleted; no code written or refactored; no dependency
   added — until the human explicitly confirms the specific approach discussed.
2. Hooks, CI pipelines, linters, test runners and MCP servers are dependencies and MUST follow
   this gate.
3. "Explicit confirmation" means the human says something equivalent to "yes, go with X".
   Silence, a vague reply, or moving on to another topic is NOT confirmation.
4. For a multi-step task the agent confirms the overall approach once, then re-confirms before
   any step that introduces a new decision point not already agreed.
5. Minor, non-decisional mechanical actions inside an already-approved task do not need
   re-confirmation.

### 1.3 No unapproved merges

1. The agent MUST NOT merge any branch into `dev` or `main` without the human's explicit,
   separate confirmation **at merge time**, even when every criterion below is satisfied.
2. Meeting the criteria makes a merge **eligible**, not **approved**.
3. Before asking for merge confirmation the agent MUST summarize: what is being merged, the
   ticket it closes, the test evidence including Playwright results, and any README or
   CHANGELOG updates included.

---

## 2. Merge rules

1. `feature/*` and `fix/*` merge into `dev`, never directly into `main`.
2. `dev` merges into `main` only when: every ticket in the batch is complete, README and
   CHANGELOG are updated, the full Playwright suite is green, and `docs/BUGS.md` has no open
   critical or high bug for the batch.
3. Working branches are **squash-merged** into `dev`. The branch is deleted after the merge,
   locally and on the remote.
4. `dev` merges into `main` with a **merge commit** (`--no-ff`), so each release is one
   visible merge.
5. No merge lands without a one-line summary of what changed and why.
6. A release merges `dev` into `main` only with the human's separate confirmation, as in
   §1.3.

## 3. README.md

1. `README.md` MUST reflect the current setup steps, environment variables and run commands,
   including how to run the Playwright suite.
2. It MUST be updated in the **same commit or PR** as any change that affects them — a new
   dependency, a new script, a changed configuration.
3. A stale README means the PR is not done. It is not a follow-up task.

## 4. CHANGELOG.md

1. `CHANGELOG.md` follows **Keep a Changelog**: `Added` / `Changed` / `Fixed` / `Removed`
   under each version and date heading.
2. It is updated on every merge into `dev`, not only on a release, under an `[Unreleased]`
   heading.
3. Entries move under a version heading when that version is tagged.

## 5. session_log.md

1. After every change, an entry is appended to `session_log.md` at the repository root:

```
## Session YYYY-MM-DD HH:MM

### Changes
- [file_path] — brief description of change

### Skill(s) / Tool(s) Used
- `skill-name` or `playwright-mcp`

### Status
- [completed/in-progress/blocked]
```

2. It is a complete record of every AI session, including in-progress and blocked work.
3. `CHANGELOG.md` is the curated, human-readable subset. They are not duplicates.

## 6. Housekeeping

1. `.gitignore` MUST cover environment files, build artifacts, dependency folders
   (`node_modules`, `venv`), editor configuration, and test output (`test-results/`,
   `playwright-report/`). It is verified before the first commit of a new project.
2. No secret, API key or credential may be committed, ever. If one slips in it MUST be
   **rotated**, not merely deleted from history.
3. `main` MUST always build and pass its tests on a fresh clone. A broken `main` is the
   highest-priority fix, above any new feature work.
4. The third-party skills in `.claude/skills/` are installed locally and are **not** part of
   the repository. They are git-ignored and absent from the history.

## 7. Code conventions

These are checkable. `code-reviewer` fails a change that breaks one.

### 7.1 Size and cleanliness

1. No code file may exceed **300 LOC**.
2. No dead code, no speculative "just in case" abstraction, no duplicate logic, no unused
   import or variable.
3. Write code only to spec: the minimum that satisfies the current ticket, one simple
   solution.
4. If a rule is ambiguous, clarify it — do not assume.

### 7.2 TypeScript

5. `strict` plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`,
   `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`.
6. `erasableSyntaxOnly` means **no `enum`** and **no constructor parameter properties**. Use
   union types of string literals.
7. `verbatimModuleSyntax` is on: type-only imports MUST use `import type`.

### 7.3 Naming

| Thing                  | Convention  | Example                          |
| ---------------------- | ----------- | -------------------------------- |
| Files and folders      | kebab-case  | `payment-allocations.ts`         |
| Components             | PascalCase  | `PaymentReceipt`                 |
| Hooks                  | `useX`      | `useOptimisticMutation`          |
| Types                  | PascalCase  | `ChargeKind`                     |
| SQL tables and columns | snake_case  | `academic_years`, `amount_minor` |
| i18n keys              | dotted path | `payments.receipt.title`         |

8. Values that identify a fixed set are union types, not enums:
   `type ChargeKind = 'admission' | 'monthly' | 'other'`.

### 7.4 Money, dates and ids

9. Money is a whole number of taka. A float MUST NOT appear in a money column, parameter
   or calculation. See [`SECURITY.md`](SECURITY.md) §5.
10. Percent discounts round exactly once, at the end, to the nearest taka.
11. Dates are stored `YYYY-MM-DD`, months `YYYY-MM`, timestamps epoch milliseconds UTC, and
    displayed in Asia/Dhaka. Arithmetic uses `date-fns`.
12. Primary keys are UUIDv7 from one `newId()` helper. Human-facing numbers come from the
    `counters` table.

### 7.5 Modules and SQL

13. UI code MUST NOT contain SQL. See [`TAD.md`](TAD.md) §2.
14. SQL MUST use bound parameters. Identifiers MAY be interpolated only from a fixed allowlist
    in code.
15. Every list query filters `deleted_at IS NULL` unless it is an explicit trash query.
16. Every write bumps `version` and `updated_at` and writes its audit row in the same
    transaction.

### 7.6 React and the UI

17. Function components only.
18. Every async surface renders four states: loading, empty, error, content.
19. Every list that can grow past a screen uses TanStack Table and TanStack Virtual.
20. Forms use React Hook Form with a Zod resolver, and validate again in the service.
21. Every user-visible string comes from an i18next key. No hard-coded text in a component.
22. The UI rules in [`FRONTEND_SPEC.md`](FRONTEND_SPEC.md) §8 (accessibility) and §10
    (anti-patterns) are part of this document.

### 7.7 Errors

23. No user-visible error may be a bare `Error` with a hard-coded English string. Each module
    defines a small typed error set; the UI maps it to an i18n key at the edge.
24. A version conflict MUST be its own error kind, because the UI responds differently: show
    the newer values and offer a reload.
25. An error MUST NOT be swallowed. If a failure cannot be handled, it reaches the error
    boundary.
26. An error message shown to the admin MUST say what to do next.

### 7.8 Comments

27. Comments explain **why**, never what. A comment that explains a rule cites it:
    "see PLAN §7.3".
28. A comment MUST NOT restate the code.

---

## 8. Definition of Done

A PR is mergeable only when **all** of these are true.

1. Every acceptance bullet of the ticket is met.
2. No code file exceeds 300 LOC, and there is no dead code, unused import or variable,
   duplicate logic, or speculative abstraction.
3. Unit tests exist for new logic, and the ticket's E2E spec exists and passes.
4. Playwright MCP verification evidence is attached to the PR: viewports checked, console
   error count, screenshot paths.
5. `README.md` and `CHANGELOG.md` are updated in the same PR when affected.
6. `docs/BUGS.md` and `session_log.md` are current.
7. The branch name, the commit messages and the PR title follow [`BRANCHING.md`](BRANCHING.md)
   and [`COMMIT_SYSTEM.md`](COMMIT_SYSTEM.md).
8. `code-reviewer` has passed the PR.
9. The human has explicitly confirmed the merge.

---

## 9. Documentation rules

1. Every rule lives in exactly **one** document. Other documents link to it and never restate
   it.
2. A rule MUST be a checkable statement — MUST or MUST NOT — with a one-line reason, so
   `code-reviewer` can pass or fail a change against it.
3. New conventions go into the document that owns that area, and every other document that
   touches the area links to the change.
4. `docs/BUGS.md` is maintained in the order defined in §10.
5. `docs/DECISIONS.md` records every decision with its reason and date.
6. `docs/PROGRESS.md` records what is done, what is next, and what is known broken.

## 10. Bug tracking

Every bug — raised in discussion, found in review, surfaced by a failing spec, or noticed
during a Playwright MCP session — MUST be logged in [`BUGS.md`](BUGS.md) **before anything
else happens with it**.

1. Log it the moment it is identified, even if it is not being fixed now. Discussing a bug
   is not a substitute for logging it.
2. Do **not** fix a bug in the same breath it is found. Log it, then follow the confirmation
   protocol in §1 before touching code — unless the human says to fix it immediately, or the run
   is in autonomous mode, in which case [`AUTONOMY.md`](AUTONOMY.md) §5 governs.
3. The file is maintained in this order:
   1. **Status** first: `open` and `in-progress` always sort above `fixed` and `wontfix`.
   2. Within the same status, by **severity**: `critical`, `high`, `medium`, `low`.
   3. Within the same status and severity, by **found date**, oldest first.
   4. `fixed` and `wontfix` entries stay in the file and move to the bottom, so the file
      doubles as a resolved-bug history.
4. A session that touches a bug gets a `session_log.md` line referencing the `BUG-<id>`.
5. A bug fix MUST include a regression test that fails before the fix and passes after it.
6. When a bug is fixed and merged, the `CHANGELOG.md` gets a `Fixed` entry and the
   `BUGS.md` entry gets its `Status` and `Resolved` fields updated — in the same commit.

## 11. Related documents

| Document                               | Holds                                    |
| -------------------------------------- | ---------------------------------------- |
| [`BRANCHING.md`](BRANCHING.md)         | Branch lifecycle and protection.         |
| [`COMMIT_SYSTEM.md`](COMMIT_SYSTEM.md) | Commit format and allowed scopes.        |
| [`VERSIONING.md`](VERSIONING.md)       | Version source of truth and releases.    |
| [`E2E_TESTING.md`](E2E_TESTING.md)     | The Playwright protocol and merge gates. |
| [`SECURITY.md`](SECURITY.md)           | Auth, roles and the data guardrails.     |
| [`FRONTEND_SPEC.md`](FRONTEND_SPEC.md) | The UI rules §7.6 refers to.             |
