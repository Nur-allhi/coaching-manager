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

- The 11 governing documents under `docs/`: PRD, TAD, SECURITY, FRONTEND_SPEC, TICKETS,
  REPO_RULES, BUGS, BRANCHING, COMMIT_SYSTEM, VERSIONING and E2E_TESTING.
- `session_log.md`, recording every AI session.
- A GitHub Actions CI workflow: typecheck, lint, unit tests, format check, build, the
  initial-JavaScript budget, then Playwright end-to-end against the production build.
- `scripts/check-bundle-budget.mjs`, enforcing the 300 KB initial-JavaScript budget.
- `public/_headers`, carrying the Content-Security-Policy and the other hardening headers.
- `scripts/publish-github.sh`, which creates the public repository and pushes it over SSH.

### Changed

- The app was renamed to **Coaching Manager**.
- The third-party agent skills moved out of version control. They are installed locally and
  are git-ignored; they are not ours to licence.

### Removed

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
