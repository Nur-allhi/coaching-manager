# Coaching Manager

[![CI](https://github.com/Nur-allhi/coaching-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/Nur-allhi/coaching-manager/actions/workflows/ci.yml)

Offline-first single-page app for a coaching center admin. React 19 + TypeScript + SQLite
(WASM) over OPFS. All data stays on the device; the app makes no network calls at runtime.

Repository: <https://github.com/Nur-allhi/coaching-manager>

Plan v1.0 — see [`docs/PLAN.md`](docs/PLAN.md) (source of truth).

## Documentation

| File                                             | What it covers                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| [`AGENTS.md`](AGENTS.md)                         | Working agreement for any agent; auto-loaded by OpenCode and Claude Code       |
| [`docs/PLAN.md`](docs/PLAN.md)                   | The product plan: scope, locked decisions, schema, phases, acceptance lines    |
| [`docs/PRD.md`](docs/PRD.md)                     | Product vision, v1 scope, the six critical workflows                           |
| [`docs/TAD.md`](docs/TAD.md)                     | Architecture, the `Db` contract, the full schema, module ownership, migrations |
| [`docs/SECURITY.md`](docs/SECURITY.md)           | Threat model, PIN and roles, data guardrails, CSP, supply chain                |
| [`docs/FRONTEND_SPEC.md`](docs/FRONTEND_SPEC.md) | Design tokens, layout, every screen, states, accessibility                     |
| [`docs/TICKETS.md`](docs/TICKETS.md)             | The execution queue: one ticket, one branch, one PR                            |
| [`docs/REPO_RULES.md`](docs/REPO_RULES.md)       | Confirmation protocol, merge rules, code conventions, Definition of Done       |
| [`docs/BUGS.md`](docs/BUGS.md)                   | The queue of known issues                                                      |
| [`docs/BRANCHING.md`](docs/BRANCHING.md)         | Branch types, lifecycle, release and hotfix flow, protection                   |
| [`docs/COMMIT_SYSTEM.md`](docs/COMMIT_SYSTEM.md) | Commit format, types, allowed scopes                                           |
| [`docs/VERSIONING.md`](docs/VERSIONING.md)       | SemVer, version sources of truth, the release procedure                        |
| [`docs/E2E_TESTING.md`](docs/E2E_TESTING.md)     | The Playwright MCP workflow, spec rules, coverage matrix, merge gates          |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)     | Setup, scripts, tooling, common tasks                                          |
| [`docs/PROGRESS.md`](docs/PROGRESS.md)           | Task log: what is done, what is next, what is known broken                     |
| [`docs/DECISIONS.md`](docs/DECISIONS.md)         | Every decision taken, with the reason                                          |
| [`CHANGELOG.md`](CHANGELOG.md)                   | Curated, human-readable changes                                                |
| [`session_log.md`](session_log.md)               | Every AI session, including in-progress and blocked work                       |

## Requirements

- Node 22+ (developed on Node 24)
- pnpm 10

## Scripts

| Script                              | What it does                                                     |
| ----------------------------------- | ---------------------------------------------------------------- |
| `pnpm dev`                          | Vite dev server                                                  |
| `pnpm build`                        | Type-check all projects, then build to `dist/`                   |
| `pnpm preview`                      | Serve the production build                                       |
| `pnpm typecheck`                    | `tsc -b` over app, node and e2e projects                         |
| `pnpm lint`                         | ESLint (flat config)                                             |
| `pnpm lint:fix`                     | ESLint with autofix                                              |
| `pnpm format` / `pnpm format:check` | Prettier                                                         |
| `pnpm test` / `pnpm test:watch`     | Vitest (jsdom)                                                   |
| `pnpm coverage`                     | Vitest with V8 coverage                                          |
| `pnpm e2e`                          | Playwright (Chromium) against `vite preview`                     |
| `pnpm check`                        | typecheck + lint + test + build, the gate before closing a phase |

## Layout

```
src/
  app/          shell, registry, providers, router, error boundary
  core/
    db/         worker, client, migrate, repository helpers, uuid
    backup/     snapshots, restore, file export and import
    audit/      audit log writer, undo
    auth/       PIN, session, roles
    i18n/       translations and the locale toggle
    money/      integer-paisa arithmetic, formatting, parsing
    dates/      injectable clock, Dhaka date and month helpers
    print/ export/ ui/
  modules/
    settings/ academics/ students/ enrollments/ payments/
    attendance/ exams/ leaderboard/ dashboard/ reports/ data-tools/
  components/ui/  shadcn/ui primitives (generated)
docs/           PLAN.md, PROGRESS.md, DECISIONS.md
e2e/            Playwright specs
```

## Rules that shape the code

- Money is never a float. Amounts are integer paisa in `*_minor` columns.
- Business records are never hard-deleted; every default list query filters
  `deleted_at IS NULL`.
- UI code never runs SQL. It goes through module services and repositories.
- Every mutation is audited, and every form submits an `expectedVersion` so a stale form
  cannot silently overwrite newer data.
- No analytics, no CDN, no remote fonts, no cloud APIs.

## First run

```bash
pnpm install
pnpm exec playwright install chromium   # for pnpm e2e
pnpm dev
```
