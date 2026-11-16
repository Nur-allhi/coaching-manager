# Coaching Center Manager

Offline-first single-page app for a coaching center admin. React 19 + TypeScript + SQLite
(WASM) over OPFS. All data stays on the device; the app makes no network calls at runtime.

Plan v1.0 — see [`docs/PLAN.md`](docs/PLAN.md) (source of truth),
[`docs/PROGRESS.md`](docs/PROGRESS.md) (task log),
[`docs/DECISIONS.md`](docs/DECISIONS.md) (decisions taken).

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
    db/         worker, client, migrate, repository helpers, uuid, clock
    backup/     snapshots, restore, file export and import
    audit/      audit log writer, undo
    auth/       PIN, session, roles
    i18n/ money/ dates/ print/ export/ ui/
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
