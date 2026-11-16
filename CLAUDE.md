# Coaching Manager — working agreement

This file is loaded automatically by every agent that opens this repository. OpenCode reads
`AGENTS.md`; `CLAUDE.md` is a byte-identical mirror for Claude Code.

**Read it at the start of every conversation.** Update it when a new convention or file is
introduced.

---

## 1. Available skills and tools

| Skill / tool       | Purpose                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| `frontend-design`  | Visual direction, typography, avoiding templated defaults                 |
| `ui-ux-pro-max`    | Palettes, spacing, chart and layout choices, accessibility review         |
| `senior-frontend`  | Building or changing any UI: states, keyboard, screen reader, phone width |
| `senior-backend`   | Service design, database optimisation, security, performance              |
| `code-reviewer`    | Reviewing a diff or a branch for real bugs, and enforcing the rules below |
| `senior-architect` | Architecture decisions, trade-offs, diagrams                              |
| `skill-creator`    | Writing and measuring new skills                                          |
| `gitnexus`         | The code knowledge graph: blast radius, execution flows, change analysis  |
| `playwright-mcp`   | The agent's real browser, for verification and for discovering selectors  |

The skills live in `.claude/skills/` (installed locally, **not** committed). GitNexus added
its own skills to `~/.config/opencode/skills/`. Load one with the `skill` tool by id, or
mention `@skill-id` in a prompt.

---

## 2. Project structure

```
.
├── AGENTS.md            this file
├── CLAUDE.md            byte-identical mirror, for Claude Code
├── CHANGELOG.md         curated, human-readable changes (Keep a Changelog)
├── session_log.md       every AI session, including in-progress and blocked work
├── opencode.json        MCP servers and project settings
├── docs/                the governing documents — see the table below
├── e2e/                 Playwright specs
├── scripts/             seed generator, bundle budget check, publish script
├── public/              static assets, PWA icons, security headers
└── src/
    app/                 shell, registry, providers, router, error boundary
      dev/               dev-only helpers (the Agentation toolbar lives here)
    core/
      db/                worker, client, migrate, repository helpers, uuid, clock
      backup/            snapshots, restore, file export and import
      audit/             audit log writer, undo
      auth/              PIN, session, roles
      i18n/ money/ dates/ print/ export/ ui/
    modules/
      settings/ academics/ students/ enrollments/ payments/
      attendance/ exams/ leaderboard/ dashboard/ reports/ data-tools/
    components/ui/       shadcn/ui primitives — generated, never hand-edited
    hooks/               shared hooks
    lib/                 `cn` and other tiny helpers
    test/                Vitest setup
```

The `@/` alias points at `src/`.

### The documents

| Document                                         | Holds                                                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| [`docs/PLAN.md`](docs/PLAN.md)                   | The build plan: scope, locked decisions, schema, phases, acceptance lines. The plan of record.  |
| [`docs/PRD.md`](docs/PRD.md)                     | What the product is for: vision, scope, critical workflows.                                     |
| [`docs/TAD.md`](docs/TAD.md)                     | How it is built: layering, the `Db` contract, the schema, module ownership.                     |
| [`docs/SECURITY.md`](docs/SECURITY.md)           | Auth, roles, the data guardrails, the threat model, the review checklist.                       |
| [`docs/FRONTEND_SPEC.md`](docs/FRONTEND_SPEC.md) | Tokens, layout, every screen, states, accessibility.                                            |
| [`docs/TICKETS.md`](docs/TICKETS.md)             | The execution queue: one ticket, one branch, one PR.                                            |
| [`docs/REPO_RULES.md`](docs/REPO_RULES.md)       | The confirmation protocol, merge rules, code conventions, Definition of Done, the bug protocol. |
| [`docs/BUGS.md`](docs/BUGS.md)                   | The queue of known issues, in a fixed order.                                                    |
| [`docs/BRANCHING.md`](docs/BRANCHING.md)         | Branch types, lifecycle, release and hotfix flow, protection.                                   |
| [`docs/COMMIT_SYSTEM.md`](docs/COMMIT_SYSTEM.md) | Commit format, types, allowed scopes.                                                           |
| [`docs/VERSIONING.md`](docs/VERSIONING.md)       | SemVer, the version sources of truth, the release procedure.                                    |
| [`docs/E2E_TESTING.md`](docs/E2E_TESTING.md)     | The Playwright MCP workflow, spec rules, coverage matrix, merge gates.                          |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)     | Setup, scripts, tooling, common tasks.                                                          |
| [`docs/PROGRESS.md`](docs/PROGRESS.md)           | What is done, what is next, what is known broken.                                               |
| [`docs/DECISIONS.md`](docs/DECISIONS.md)         | Every decision, with its reason and date.                                                       |

**Each rule lives in exactly one document.** Other documents link to it and never restate it.
When you add a rule, put it in the document that owns that area and fix the links.

---

## 3. Workflow rules

### 3.1 Read before you write

1. Read the ticket in `docs/TICKETS.md`, the plan phase in `docs/PLAN.md` §9, and the module
   spec in `docs/PLAN.md` §8.
2. Read the relevant sections of `docs/TAD.md`, `docs/FRONTEND_SPEC.md` and
   `docs/SECURITY.md`.
3. Check the blast radius of what you are about to touch with GitNexus `impact` before you
   edit a symbol.

### 3.2 The decision-making and confirmation protocol

The full protocol is in [`docs/REPO_RULES.md`](docs/REPO_RULES.md) §1. In short, and without
restating it: surface the choice, offer at least two genuinely viable options with their
trade-offs and your leaning, and **wait for an explicit confirmation** before creating,
editing or deleting anything, writing code, or adding a dependency. Hooks, CI pipelines,
linters, test runners and MCP servers are dependencies and follow the same gate.

No merge into `dev` or `main` happens without a separate, explicit confirmation at merge
time. Meeting the criteria makes a merge _eligible_, not _approved_.

### 3.3 The bug tracking protocol

The full protocol is in [`docs/REPO_RULES.md`](docs/REPO_RULES.md) §10. In short: log the bug
in [`docs/BUGS.md`](docs/BUGS.md) **first**, before anything else happens with it, in the
order that file defines. Do not fix it until the approach is confirmed. A fix ships with a
regression test that fails before and passes after.

### 3.4 The repo management rules

Merge rules, the README and CHANGELOG obligations, housekeeping and the Definition of Done
are in [`docs/REPO_RULES.md`](docs/REPO_RULES.md) §2–§8. Read them before opening a PR.

The three linked documents:

- [`docs/BRANCHING.md`](docs/BRANCHING.md) — branch types, names, lifecycle, protection, the
  PR template.
- [`docs/COMMIT_SYSTEM.md`](docs/COMMIT_SYSTEM.md) — the commit format, the type table and the
  allowed scopes.
- [`docs/VERSIONING.md`](docs/VERSIONING.md) — SemVer, the sources of truth, the release
  procedure.
- [`docs/E2E_TESTING.md`](docs/E2E_TESTING.md) — the verification workflow, the spec rules,
  the coverage matrix and the merge gates.

### 3.5 Code conventions

The enforceable conventions — size, cleanliness, TypeScript, naming, money, dates, modules,
SQL, React and errors — are in [`docs/REPO_RULES.md`](docs/REPO_RULES.md) §7. The UI rules
are in [`docs/FRONTEND_SPEC.md`](docs/FRONTEND_SPEC.md) §8 and §10.

### 3.6 Housekeeping after every change

1. `pnpm check` passes — typecheck, lint, unit tests, build and the bundle budget.
2. `docs/PROGRESS.md` is updated with the task ID, what changed and the known gaps.
3. `session_log.md` gets an entry in the required format.
4. `CHANGELOG.md` gets an `[Unreleased]` entry when the change is user- or developer-relevant.
5. `docs/BUGS.md` is updated if a bug was found, fixed or had its status changed.

---

## 4. Session logs

`session_log.md` at the repository root records every AI session on this project, including
in-progress and blocked work. Its format is specified in
[`docs/REPO_RULES.md`](docs/REPO_RULES.md) §5.

Append an entry after every change. It is internal and developer-facing — it is not the same
thing as `CHANGELOG.md`.

---

## 5. Subagents

Nine focused subagents live in `.opencode/agents/` (tracked in git). They read the governing
docs as the single source of truth; they never restate them. The primary agent orchestrates;
subagents do not spawn subagents. See each agent file for its exact trigger and permissions.

| Agent              | Use for                                        |
| ------------------ | ---------------------------------------------- |
| `decision-advisor` | An open choice: lay out options and a lean     |
| `branch-manager`   | Create branches, rebase, draft PRs             |
| `e2e-tester`       | Verify UI in a browser, write Playwright specs |
| `commit-writer`    | Make an atomic Conventional Commit             |
| `code-reviewer`    | PASS/FAIL against Definition of Done           |
| `security-auditor` | Read-only security review                      |
| `bug-tracker`      | Log and update `docs/BUGS.md`                  |
| `session-logger`   | Append to `session_log.md`                     |
| `release-manager`  | Version and release preparation                |

### Standard ticket flow

1. `decision-advisor` if a choice exists, then human confirms.
2. `branch-manager` creates the branch.
3. Implement the ticket.
4. `e2e-tester` verifies and writes specs.
5. `commit-writer` commits.
6. `code-reviewer` and `security-auditor` review.
7. `branch-manager` prepares the PR; human confirms the merge.
8. `session-logger` logs; `bug-tracker` logs any bug when found.
9. `release-manager` when a batch is complete.

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **coaching-center-manager** (512 symbols, 708 relationships, 8 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource                                                 | Use for                                  |
| -------------------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/coaching-center-manager/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/coaching-center-manager/clusters`       | All functional areas                     |
| `gitnexus://repo/coaching-center-manager/processes`      | All execution flows                      |
| `gitnexus://repo/coaching-center-manager/process/{name}` | Step-by-step execution trace             |

## CLI

| Task                                         | Read this skill file                               |
| -------------------------------------------- | -------------------------------------------------- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"  | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"             | `.claude/skills/gitnexus-debugging/SKILL.md`       |
| Rename / extract / split / refactor          | `.claude/skills/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference           | `.claude/skills/gitnexus-guide/SKILL.md`           |
| Index, status, clean, wiki CLI commands      | `.claude/skills/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->
