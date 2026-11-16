# Changelog

All notable changes to **Coaching Manager** are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The version source of
truth is `package.json`; see [`docs/VERSIONING.md`](docs/VERSIONING.md).

Entries move from `[Unreleased]` into a version heading when that version is tagged. The
per-session history lives in [`session_log.md`](session_log.md); this file is the curated,
human-readable subset.

## [Unreleased]

### Added

- An i18n scaffold: i18next with full English and Bangla resources, a sidebar language toggle,
  an independent Bangla-digits setting using `Intl.NumberFormat('bn-BD')`, and no hard-coded
  user-visible strings in components (T-020, D-033).

- Void writes, undo and the History data surface in the audit layer: voids and inverses are audited in the same transaction, original history is never rewritten, and undo of a soft delete is a real restore write.
- Persistent storage is requested once on first run and its status is shown in Settings. The Workbox service worker now claims the page on install, and a new `offline.spec.ts` proves offline reload, installability and the status row.
- Autonomous build mode (`docs/AUTONOMY.md`) with decide-and-record, bounded retries and auto-merge to `dev` after green CI; scheduled nightly runs stay in worktrees and never touch `main`.
- A global error boundary with a recoverable screen that restores unsaved form values, and an
  unsaved-changes guard that blocks in-app navigation and tab close (D-029).
- A data router (`createBrowserRouter`/`RouterProvider`) built from the module registry, so
  `useBlocker` can guard navigation.
- A `smoke` Playwright project and a CI gate that runs `@smoke` specs on pull requests; the
  offline and shell-route specs are tagged, with W1–W6 tagged as those features land (D-028).
- A release workflow that publishes a GitHub release from a `vX.Y.Z` tag, using that version's
  CHANGELOG section as the body, with write permission scoped to the release job alone.
- A CI secret scan on every push and pull request, sharing one scanner with the publish script.
- The app shell: a module registry, an 11-entry sidebar that becomes a sheet below 768px, a
  sticky header, a BrowserRouter with one lazy route per module, and a 404 screen.
- Repository helpers with version-checked updates, soft delete, an audit row written in the
  same transaction, a readable refusal when a parent still has live children, and a context
  argument that carries the actor, time and id generator explicitly.
- Core helpers: UUIDv7 ids, an injectable clock, Dhaka date and month helpers, and
  integer-paisa money arithmetic with percent discounts, South Asian grouping and Bengali
  digits. The unused `uuid` dependency was replaced by `uuidv7`.
- An append-only migration runner with `app_meta.schema_version`, a pre-migration snapshot
  hook, rollback on failure, and seven module-owned SQL migrations covering the full schema.
- A `better-sqlite3` implementation of the `Db` contract and a shared contract suite, so
  repository and service tests run against real SQL without a browser.
- The serialized `Db` client: one promise queue, `tx` with BEGIN/COMMIT/ROLLBACK, nested
  transaction refusal, and unit tests for the queue and the transaction contract.
- sqlite-wasm in a dedicated Web Worker with the `opfs-sahpool` VFS, plus a Comlink client
  and a temporary `/__db-spike` verification harness.
- Playwright end-to-end specs for database persistence and the export/import round-trip,
  running on Chromium and Firefox, with WebKit smoke coverage.
- Husky, commitlint and lint-staged: commit messages are validated on commit, and staged
  files are linted and formatted before the commit lands.
- The 11 governing documents under `docs/`: PRD, TAD, SECURITY, FRONTEND_SPEC, TICKETS,
  REPO_RULES, BUGS, BRANCHING, COMMIT_SYSTEM, VERSIONING and E2E_TESTING.
- `session_log.md`, recording every AI session.
- `CHANGELOG.md`, following Keep a Changelog.
- The `dev` integration branch, with branch protection on `dev` and `main`: pull request
  required, CI required, no force-push, no deletion.
- `.github/pull_request_template.md`, matching the template in `docs/BRANCHING.md` §6.
- A GitHub Actions CI workflow: typecheck, lint, unit tests, format check, build, the
  initial-JavaScript budget, then Playwright end-to-end against the production build. It runs
  for pushes and pull requests on `dev` and on `main`.
- `scripts/check-bundle-budget.mjs`, enforcing the 300 KB initial-JavaScript budget.
- `public/_headers`, carrying the Content-Security-Policy and the other hardening headers.
- `scripts/publish-github.sh`, which creates the public repository and pushes it over SSH.

### Changed

- The app was renamed to **Coaching Manager**.
- The third-party agent skills moved out of version control. They are installed locally and
  are git-ignored; they are not ours to licence.
- `dev` became the integration branch; `main` receives releases only.

### Removed

- Safari/WebKit as a browser target (D-026). The locked browser list is now Chrome/Edge and
  Firefox; the WebKit Playwright project and its four OPFS-skipped specs are gone.
- Five superseded documents (`ARCHITECTURE`, `CONVENTIONS`, `DATA-MODEL`, `UI-GUIDELINES`,
  `TESTING`). Their rules were folded into the new set so that each rule lives in exactly one
  document.

## [0.1.0] — 2026-11-16

### Added

- The project scaffold: Vite 8, React 19, TypeScript in strict mode, ESLint, Prettier,
  Vitest, Playwright, Tailwind CSS v4 and shadcn/ui.
- The folder layout from the plan: `src/app`, `src/core`, `src/modules`.
- A PWA service worker and manifest with generated icons.
- Self-hosted Noto Sans and Noto Sans Bengali, so the app makes no remote font request.
- A unit test and an end-to-end smoke test, including a guard that the page contacts no host
  other than its own origin.

[Unreleased]: https://github.com/Nur-allhi/coaching-manager/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Nur-allhi/coaching-manager/releases/tag/v0.1.0
