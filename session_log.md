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
