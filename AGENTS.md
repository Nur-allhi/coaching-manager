# Coaching Manager — working agreement

This file is loaded automatically by every agent that opens this repository
(OpenCode reads `AGENTS.md`; `CLAUDE.md` is a byte-identical mirror for Claude Code).

`docs/PLAN.md` is the **source of truth** for the product. Read sections 1–6 before writing
code, and the phase (section 9) plus the module spec (section 8) before each task.

## Document map

| File                    | Read it when                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `docs/PLAN.md`          | Always. The product plan, schema, phases and acceptance lines.  |
| `docs/ARCHITECTURE.md`  | Before changing how data flows or where a file belongs.         |
| `docs/CONVENTIONS.md`   | Before writing code: naming, money, repositories, errors, i18n. |
| `docs/DATA-MODEL.md`    | Before touching a table, a migration or a money rule.           |
| `docs/DEVELOPMENT.md`   | Before running anything: setup, scripts, tooling, seed data.    |
| `docs/TESTING.md`       | Before adding a test or closing a phase.                        |
| `docs/UI-GUIDELINES.md` | Before building or changing any UI.                             |
| `docs/PROGRESS.md`      | After every task, to see where the work stands.                 |
| `docs/DECISIONS.md`     | Before making a choice, to see how it was already settled.      |

## Rules that are not negotiable

1. **One task ID at a time, in plan order.** Do not start a phase until the previous phase's
   exit criteria pass.
2. **A task is done only when** `pnpm typecheck` and `pnpm lint` pass, its tests exist and
   pass, the acceptance line is demonstrated, and `docs/PROGRESS.md` is updated with the task
   ID, what changed, and known gaps.
3. **Never change a Locked Decision** (PLAN §3), the schema conventions (PLAN §6) or backup and
   restore (PLAN §7.3) without asking the human first. For Open Decisions (PLAN §4) use the
   stated default and record it in `docs/DECISIONS.md`.
4. **No network calls at runtime.** No analytics, no CDN, no remote fonts, no cloud APIs. The
   app must work fully offline. There is an e2e test that fails the build if the page contacts
   any host other than its own.
5. **Money is never a float.** Amounts are integer paisa in `*_minor` columns. Percent
   discounts round exactly to the paisa and the rounding rule is tested.
6. **Business records are never hard-deleted.** Soft delete only; every default list query
   filters `deleted_at IS NULL`.
7. **UI code never runs SQL.** It goes through module services and repositories. A module may
   only touch its own tables; other modules import its public `index.ts`.
8. **Every mutation is audited** in the same transaction as the change.
9. **If a rule is ambiguous or two rules conflict, stop and ask.** Never guess on money,
   backup, restore or migration behaviour.
10. **One task per commit.** Message format: `feat(payments): P3-2 record payment`.

## Working agreement

- Read the phase and the module spec before starting a task, not while writing it.
- Keep the plan's folder layout. `src/app`, `src/core/*`, `src/modules/*`, `src/components/ui`.
- Never edit a shipped migration. Migrations are append-only.
- Never rename symbols with find-and-replace. Use the graph tooling.
- Run `pnpm check` (typecheck + lint + test + build) before proposing a commit.
- Prefer small, reviewable commits over large ones.

## Tooling available in this repository

| Tool                                                                      | Use it for                                                                                                                                                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **GitNexus** (MCP + CLI, `.gitnexus/`)                                    | Blast radius before editing, execution flows, change analysis before committing. See the block below.                                                                                |
| **Playwright MCP**                                                        | Driving the real app in a browser: check a screen, reproduce a UI bug, capture console errors.                                                                                       |
| **Agentation** (MCP + dev toolbar)                                        | The human clicks an element in the running app and leaves a note; read it with `agentation_get_all_pending`, then reply, resolve or dismiss.                                         |
| **Claude skills** in `.claude/skills/` (installed locally, not committed) | `frontend-design`, `ui-ux-pro-max`, `senior-frontend` for UI work; `code-reviewer` for review; `senior-architect`, `senior-backend` for design; `skill-creator` to write new skills. |

Full instructions for these live in `docs/DEVELOPMENT.md`.

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
