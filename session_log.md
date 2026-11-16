# Session log

An internal, developer-facing record of every AI session on this project, including
in-progress and blocked work.

This is not [`CHANGELOG.md`](CHANGELOG.md), which is the curated, human-readable subset of
completed, user- or developer-relevant changes. Nor is it
[`docs/BUGS.md`](docs/BUGS.md), which is the queue of known issues.

Format, per [`docs/REPO_RULES.md`](docs/REPO_RULES.md) §5:

```
## Session YYYY-MM-DD HH:MM

### Changes
- [file_path] — brief description of change

### Skill(s) / Tool(s) Used
- `skill-name` or `playwright-mcp`

### Status
- [completed/in-progress/blocked]
```

---

## Session 2026-11-16 21:34

### Changes

- `.opencode/agents/branch-manager.md`, `.opencode/agents/code-reviewer.md`,
  `.opencode/agents/commit-writer.md`, `.opencode/agents/e2e-tester.md`,
  `.opencode/agents/release-manager.md`, `.opencode/agents/security-auditor.md` — six subagent
  files: reviewed and relaxed permissions per human decision D-030 (option 3, maximum). In-scope
  ask rules converted to allow, missing GitNexus/pnpm budget/dev-server permissions added, bodies
  updated to act without asking, and hard gates kept (no merge, no force push, no push to
  main/dev, no branch delete).
- `docs/DECISIONS.md` — added D-030.

### Skill(s) / Tool(s) Used

- `gitnexus`
- `senior-backend` (or `opencode`)
- `code-reviewer`

### Status

in-progress — on branch `chore/subagent-permissions`; not committed or merged yet. T-017 work is
stashed on `feature/error-boundary`.

## Session 2026-11-16 21:55

### Changes

- `src/app/router.ts`, `src/app/router-layout.tsx` — T-017: data router migration.
- `src/app/ErrorBoundary.tsx` — global ErrorBoundary with a recoverable screen.
- `src/core/ui/form-drafts.ts`, `src/core/ui/use-draft-form.ts` — sessionStorage draft persistence.
- `src/app/useNavigationGuard.ts` — unsaved-changes guard.
- dev `CrashProbe` route — development-only crash trigger for verification.
- `e2e/specs/error-boundary.spec.ts` — 5 e2e specs for the error boundary.
- `docs/DECISIONS.md` (D-029), `docs/PROGRESS.md`, `CHANGELOG.md` — decision record and
  housekeeping updates. Work is on branch `feature/error-boundary`.

### Skill(s) / Tool(s) Used

- `senior-frontend`
- `decision-advisor`
- `branch-manager`
- `e2e-tester`
- `gitnexus`
- `playwright-mcp`

### Status

in-progress — T-017 implemented locally on branch `feature/error-boundary`; not committed or
merged yet.

## Session 2026-11-16 20:37

### Changes

- `.opencode/agents/branch-manager.md`, `.opencode/agents/commit-writer.md`,
  `.opencode/agents/code-reviewer.md`, `.opencode/agents/security-auditor.md`,
  `.opencode/agents/release-manager.md`, `.opencode/agents/e2e-tester.md`,
  `.opencode/agents/bug-tracker.md`, `.opencode/agents/session-logger.md`,
  `.opencode/agents/decision-advisor.md` — nine focused subagents created on branch
  `chore/opencode-subagents`.
- `AGENTS.md`, `CLAUDE.md` — added a Subagents section to AGENTS.md and mirrored it to
  CLAUDE.md.

### Skill(s) / Tool(s) Used

- `opencode`
- `senior-backend`
- `gitnexus`
- `playwright-mcp`
- `code-reviewer` (subagent exercised)
- `security-auditor` (subagent exercised)

### Status

in-progress — the branch `chore/opencode-subagents` is not committed or merged yet.

## Session 2026-11-16 19:00

### Changes

- `playwright.config.ts`, `e2e/specs/*.spec.ts`, `.github/workflows/ci.yml`,
  `docs/TICKETS.md`, `docs/E2E_TESTING.md`, `docs/DECISIONS.md` (D-028), `CHANGELOG.md` —
  T-006 smoke project, CI gate and incremental tagging.

### Skill(s) / Tool(s) Used

- `code-reviewer`

### Status

in-progress — T-006 implemented locally; its pull request awaits the human's merge
confirmation.

## Session 2026-11-16 18:45

### Changes

- `scripts/scan-secrets.sh`, `scripts/publish-github.sh`, `.github/workflows/ci.yml` — T-007:
  the secret scanner now runs in CI and in the publish script.
- `e2e/specs/`, `e2e/fixtures/`, `e2e/helpers/`, `playwright.config.ts`, `docs/E2E_TESTING.md` —
  T-005: restructured e2e folder and shared helpers.
- `.github/workflows/release.yml`, `scripts/changelog-section.mjs`, `docs/VERSIONING.md`,
  `docs/DECISIONS.md` (D-027), `CHANGELOG.md` — T-004: release workflow with scoped write.

### Skill(s) / Tool(s) Used

- `code-reviewer`
- `senior-backend`

### Status

in-progress — T-007 and T-005 are green as PRs #12 and #13; T-004 is implemented locally;
pull requests await the human's merge confirmation.

## Session 2026-11-16 17:35

### Changes

- `docs/PLAN.md` (locked browser target + P0-2 acceptance), `docs/TICKETS.md` (T-010),
  `docs/DECISIONS.md` (D-023 closed, D-026), `docs/PROGRESS.md`, `docs/E2E_TESTING.md`,
  `docs/DEVELOPMENT.md`, `CHANGELOG.md` — Safari removed as a browser target.
- `playwright.config.ts` — WebKit project removed. `e2e/sqlite-persistence.spec.ts` — WebKit
  skip block removed; all specs now run on Chromium and Firefox only.

### Skill(s) / Tool(s) Used

- `code-reviewer`

### Status

in-progress — the scope reduction is implemented; its pull request into `dev` awaits the
human's merge confirmation.

## Session 2026-11-16 17:20

### Changes

- `src/app/module-contract.ts`, `src/app/registry.ts`, `src/app/AppShell.tsx`,
  `src/app/routes.tsx`, `src/app/App.tsx`, `src/app/ModulePlaceholder.tsx` — the shell,
  registry and BrowserRouter tree.
- 11 module manifests + lazy screens under `src/modules/*/`.
- `src/test/setup.ts` — `matchMedia` polyfill for jsdom; `e2e/shell.spec.ts` — 12 new e2e tests.
- `docs/DECISIONS.md` (D-025), `docs/TICKETS.md`, `docs/PROGRESS.md`, `CHANGELOG.md` — updated.

### Skill(s) / Tool(s) Used

- `senior-frontend`
- `ui-ux-pro-max`
- `gitnexus`
- `playwright-mcp`

### Status

in-progress — T-016 is implemented and green; its pull request into `dev` awaits the human's
merge confirmation.

## Session 2026-11-16 16:50

### Changes

- `src/core/audit/write.ts`, `src/core/db/relationships.ts`, `src/core/db/repository.ts` —
  T-015 repository helpers with same-transaction audit writes and parent/child refusal.
- `src/core/db/repository.test.ts` — 14 tests, including rollback and child refusal.
- `docs/DECISIONS.md` (D-024), `docs/TICKETS.md`, `docs/PROGRESS.md`, `CHANGELOG.md` — the
  human split the audit write between T-015 and T-030, and chose explicit audit context.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `gitnexus`
- `code-reviewer`

### Status

in-progress — T-015 is implemented and green; its pull request into `dev` awaits the human's
merge confirmation.

## Session 2026-11-16 16:35

### Changes

- `src/core/db/uuid.ts`, `src/core/dates/clock.ts`, `src/core/dates/dates.ts`,
  `src/core/money/money.ts` — the T-014 core helpers.
- Three new test files: 30 tests for UUIDv7, the injectable clock, Dhaka dates and months,
  and money arithmetic in both digit scripts.
- `package.json`, `pnpm-lock.yaml` — replaced the unused `uuid` package with `uuidv7`, as
  PLAN.md §3 specifies.
- `README.md` — corrected the `core/` layout after the helpers moved into `dates/`.
- `docs/PROGRESS.md`, `CHANGELOG.md`, `docs/DECISIONS.md` — updated; the last records the
  human's acceptance of the Safari gap on 2026-11-16.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `code-reviewer`
- `gitnexus`

### Status

in-progress — T-014 is implemented and green; its pull request into `dev` awaits the human's
merge confirmation.

## Session 2026-11-16 16:00

### Changes

- `src/core/db/split-sql.ts`, `src/core/db/migrate.ts`, `src/core/db/migrations.ts` — the
  append-only migration runner and its registry.
- Seven SQL files under `src/modules/*/migrations/` contributing the full schema.
- `src/core/db/split-sql.test.ts`, `src/core/db/migrate.test.ts` — 9 new tests.
- `docs/PROGRESS.md`, `CHANGELOG.md` — updated.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `code-reviewer`

### Status

in-progress — T-013 is implemented and green; its pull request into `dev` awaits the human's
merge confirmation.

## Session 2026-11-16 15:40

### Changes

- `src/core/db/testing/better-sqlite3.ts` — the `Db` test double on better-sqlite3.
- `src/core/db/contract.ts` — one contract suite shared by every implementation.
- `src/core/db/testing/better-sqlite3.test.ts` — registers the suite for this implementation.
- `docs/PROGRESS.md`, `CHANGELOG.md` — updated.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `code-reviewer`

### Status

in-progress — T-012 is implemented and green. Its PR is stacked on the still-open PR #4; both
await the human's merge confirmation.

## Session 2026-11-16 15:30

### Changes

- `src/core/db/types.ts`, `src/core/db/queue.ts`, `src/core/db/client.ts` — the serialized
  `Db` client with a real transaction contract.
- `src/core/db/worker.ts` — BEGIN, COMMIT and ROLLBACK over Comlink.
- `src/core/db/queue.test.ts`, `src/core/db/client.test.ts` — 8 new unit tests.
- `src/app/dev/DbSpikeHarness.tsx`, `e2e/sqlite-persistence.spec.ts` — a browser-level
  rollback check.
- `docs/PROGRESS.md`, `CHANGELOG.md` — updated.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `playwright-mcp`
- `code-reviewer`

### Status

in-progress — T-011 is implemented and green; its pull request into `dev` awaits the human's
merge confirmation.

## Session 2026-11-16 15:10

### Changes

- `src/core/db/worker.ts` — sqlite-wasm + opfs-sahpool VFS in a Worker, exposed over Comlink.
- `src/core/db/client.ts` — the main-thread Worker wrapper.
- `src/app/dev/DbSpikeHarness.tsx` — temporary `/__db-spike` harness for browser verification.
- `src/app/App.tsx` — serves the harness at its path; removed in P0-3.
- `e2e/sqlite-persistence.spec.ts` — persistence, byte round-trip, and console/network specs.
- `playwright.config.ts` — added Firefox and WebKit projects.
- `docs/DECISIONS.md` — D-023 records the cross-browser findings, including the WebKit OPFS
  gap and the local library fix.
- `docs/PROGRESS.md`, `docs/E2E_TESTING.md`, `CHANGELOG.md` — updated.
- `.github/workflows/ci.yml` — CI now installs chromium, firefox and webkit with their
  system dependencies. The first run of PR #3 failed because only chromium was installed.

### Skill(s) / Tool(s) Used

- `senior-backend`
- `senior-frontend`
- `playwright-mcp`
- `code-reviewer`

### Status

in-progress — Chromium and Firefox pass; Safari on macOS is still unverified, so P0-2 cannot
be closed yet. The pull request into `dev` awaits the human's merge confirmation.

## Session 2026-11-16 08:35

### Changes

- PR #1 — squash-merged into `dev` on the human's explicit confirmation.
- `.husky/commit-msg`, `.husky/pre-commit` — added; commitlint and lint-staged now run on
  commit.
- `commitlint.config.js` — added, enforcing the scope allowlist, the nine allowed types, the
  72-character subject limit, lowercase imperative subjects, no trailing period and the
  forbidden-subject list.
- `package.json` — added the four dev dependencies and the `lint-staged` configuration.
- `docs/COMMIT_SYSTEM.md` §7 — records the chosen enforcement mechanism.
- `docs/DECISIONS.md` — D-018 to D-022 record the five decisions the human made.
- `docs/PROGRESS.md`, `CHANGELOG.md` — updated.

### Skill(s) / Tool(s) Used

- `gitnexus`
- `code-reviewer`
- `senior-backend`

### Status

in-progress — commit message enforcement is implemented and verified locally, but its pull
request into `dev` is awaiting the human's merge confirmation.

## Session 2026-11-16 07:35

### Changes

- `docs/PRD.md` — product vision, scope, the six critical workflows, success criteria.
- `docs/TAD.md` — layering, the `Db` contract, the full schema, module ownership, the
  migration and backup rules.
- `docs/SECURITY.md` — threat model, PIN and role enforcement, the data guardrails, CSP and
  supply-chain rules.
- `docs/FRONTEND_SPEC.md` — design tokens, layout, the route map, every screen, the component
  inventory, states and accessibility.
- `docs/TICKETS.md` — 42 tickets across the repo foundation and PLAN phases P0 to P7.
- `docs/REPO_RULES.md` — the confirmation protocol, merge rules, code conventions, the
  Definition of Done and the bug protocol.
- `docs/BUGS.md` — initialised empty.
- `docs/BRANCHING.md` — branch types, lifecycle, release and hotfix flow, protection rules.
- `docs/COMMIT_SYSTEM.md` — commit format, types, the allowed-scope vocabulary.
- `docs/VERSIONING.md` — SemVer, the version sources of truth, the release procedure.
- `docs/E2E_TESTING.md` — the Playwright MCP workflow, spec rules, the coverage matrix, the
  failure protocol and the merge gates.
- `docs/DEVELOPMENT.md` — trimmed to the operational reference; the rules it used to carry now
  live in the documents above.
- `docs/ARCHITECTURE.md`, `docs/CONVENTIONS.md`, `docs/DATA-MODEL.md`, `docs/UI-GUIDELINES.md`,
  `docs/TESTING.md` — removed; their rules were folded into the new set.
- `CHANGELOG.md`, `session_log.md` — created.
- `AGENTS.md` — rewritten to the required structure.
- `.github/pull_request_template.md` — added.
- `.github/workflows/ci.yml` — the trigger now covers `dev` as well as `main`, for both pushes
  and pull requests. Without it, the required status checks on `dev` could never pass.
- `dev` branch — created and pushed.
- Branch protection on `main` and `dev`: pull request required, both CI jobs required and
  the branch up to date, no force-push, no deletion, conversation resolution required,
  enforced on admins.
- The repository allows squash and merge commits but not rebase, because `dev` takes squash
  merges from working branches while `main` takes a merge commit from `dev`. GitHub does not
  support a merge method per branch, so the distinction is enforced by the documented rules
  in `docs/BRANCHING.md` §7.
- Pull request #1 opened into `dev`. It is **not** merged: `docs/REPO_RULES.md` §1.3 requires
  the human's explicit confirmation at merge time.

### Skill(s) / Tool(s) Used

- `skill-creator`
- `senior-backend`
- `senior-frontend`
- `ui-ux-pro-max`
- `frontend-design`
- `code-reviewer`
- `gitnexus`
- `playwright-mcp`

### Status

completed
