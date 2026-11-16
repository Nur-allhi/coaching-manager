# Development guide

Everything needed to set up, run, test and navigate this repository.

## 1. Requirements

| Tool                | Version                                 | Notes                                            |
| ------------------- | --------------------------------------- | ------------------------------------------------ |
| Node                | 22 or newer (developed on 24)           | Required by Vite 8 and the toolchain.            |
| pnpm                | 10                                      | `npm i -g pnpm@10` if Corepack is not available. |
| Playwright browsers | Chromium (and Firefox, WebKit for P0-2) | `pnpm exec playwright install chromium`          |

## 2. Setup

```bash
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

The app is served at `http://localhost:5173`.

## 3. Scripts

| Script                              | What it does                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`                          | Vite dev server with HMR                                                         |
| `pnpm build`                        | `tsc -b` across all three projects, then a production build to `dist/`           |
| `pnpm preview`                      | Serve the production build (what Playwright runs against)                        |
| `pnpm typecheck`                    | Type-check `src`, the build scripts and `e2e`                                    |
| `pnpm lint`                         | ESLint over the whole repo                                                       |
| `pnpm lint:fix`                     | ESLint with autofix                                                              |
| `pnpm format` / `pnpm format:check` | Prettier write / check                                                           |
| `pnpm test` / `pnpm test:watch`     | Vitest in jsdom                                                                  |
| `pnpm coverage`                     | Vitest with V8 coverage into `coverage/`                                         |
| `pnpm e2e`                          | Playwright against `vite preview` on port 4173                                   |
| `pnpm e2e:ui` / `pnpm e2e:report`   | Playwright UI mode / open the last report                                        |
| `pnpm check`                        | `typecheck` + `lint` + `test` + `build`. **Run this before proposing a commit.** |

## 4. The task workflow

The plan (`docs/PLAN.md` §9) lists tasks as `P<phase>-<n>`. Work one at a time, in order.

```
1. Read the phase in PLAN §9 and the module spec in PLAN §8.
2. Read docs/ARCHITECTURE.md, docs/CONVENTIONS.md and the relevant part of
   docs/DATA-MODEL.md.
3. Check the blast radius of what you are about to touch (GitNexus, below).
4. Write the code and its tests.
5. pnpm check        → typecheck, lint, test and build all green.
6. Demonstrate the acceptance line from PLAN §9.
7. Update docs/PROGRESS.md: task ID, what changed, known gaps.
8. Commit: feat(payments): P3-2 record payment
```

A task is not done until step 7 is finished. If you cannot meet the acceptance line, say so
in `docs/PROGRESS.md` under "Known gaps" rather than quietly moving on.

## 5. Repository layout

```
src/
  app/            shell, registry, providers, router, error boundary
    dev/          dev-only helpers (the Agentation toolbar lives here)
  core/
    db/           worker, client, migrate, repository helpers, uuid, clock
    backup/       snapshots, restore, file export and import
    audit/        audit log writer, undo
    auth/         PIN, session, roles
    i18n/  money/  dates/  print/  export/  ui/
  modules/
    settings/ academics/ students/ enrollments/ payments/
    attendance/ exams/ leaderboard/ dashboard/ reports/ data-tools/
  components/ui/  shadcn/ui primitives — generated, do not hand-edit
  hooks/          shared hooks
  lib/            `cn` and other tiny helpers
  test/           Vitest setup
docs/             the documentation set
e2e/              Playwright specs
scripts/          seed generator and other one-off scripts
```

The `@/` alias points at `src/`.

## 6. Tooling

### 6.1 GitNexus — code intelligence

A knowledge graph of this repository, built from the source. Index lives in `.gitnexus/`
(git-ignored). 512 symbols, 708 relationships and 8 execution flows at the time of writing.

**MCP tools** (already connected): `gitnexus.query`, `gitnexus.context`, `gitnexus.impact`,
`gitnexus.explain`, `gitnexus.detect_changes`, `gitnexus.check`, and more.

**CLI**, for when the MCP server is not running:

```bash
pnpm exec gitnexus status                    # index freshness
pnpm exec gitnexus analyze                   # re-index after a big change
pnpm exec gitnexus query "payment allocation"
pnpm exec gitnexus context chargeNet
pnpm exec gitnexus impact chargeNet --direction upstream
pnpm exec gitnexus wiki                      # generate a repo wiki
```

Use it for: "what calls this?", "what breaks if I change this?", "how does this flow work?".

Do **not** use it as a substitute for reading the code before changing behaviour.

### 6.2 Playwright MCP — drive the real app

Already connected. Start the app (`pnpm dev` or `pnpm preview`), then use the tools:
`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`,
`browser_console_messages`, `browser_network_requests`, `browser_take_screenshot`, and so on.

Use it to: verify a screen actually renders, reproduce a UI bug, check the console is clean,
capture what a screen looks like.

It runs headless and with an isolated profile, so OPFS starts empty on every run.

The MCP pins its own browser build, separate from the one `@playwright/test` uses. It is
already installed here; on a fresh machine run:

```bash
pnpm exec playwright-mcp install-browser chrome-for-testing
```

### 6.3 Agentation — visual feedback from the human

Two halves:

- **In the app**: a dev-only toolbar (bottom right) appears when you run `pnpm dev`. The human
  clicks an element, types a note, and it is sent to the local annotation server.
- **In the agent**: the `agentation` MCP server exposes `agentation_get_all_pending`,
  `agentation_reply`, `agentation_resolve`, `agentation_dismiss` and friends.

Typical loop:

```
agentation_get_all_pending()          → read the notes
… make the change …
agentation_reply(id, "fixed, see the commit")   → tell the human
agentation_resolve(id, "done")                → close it
```

The toolbar is imported lazily and only when `import.meta.env.DEV` is true, so it is not in the
production bundle.

### 6.4 Skills

`.claude/skills/` holds the project skills. OpenCode reads this directory directly.

| Skill              | Use for                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| `frontend-design`  | Visual direction, typography, avoiding templated defaults                 |
| `ui-ux-pro-max`    | Palettes, spacing, chart and layout choices, accessibility review         |
| `senior-frontend`  | Building or changing any UI: states, keyboard, screen reader, phone width |
| `code-reviewer`    | Reviewing a diff or a branch for real bugs                                |
| `senior-architect` | Architecture decisions, trade-offs, diagrams                              |
| `senior-backend`   | Service design, database optimization, security, performance              |
| `skill-creator`    | Writing and measuring new skills                                          |

GitNexus added 12 more skills to `~/.config/opencode/skills/`
(`gitnexus-exploring`, `gitnexus-impact-analysis`, `gitnexus-debugging`,
`gitnexus-refactoring`, `gitnexus-review`, `gitnexus-plan`, `gitnexus-work`, and more).

Load one with the `skill` tool by id, or mention `@skill-id` in a prompt.

### 6.5 shadcn/ui

`src/components/ui/` is generated. To add or update a component:

```bash
pnpm dlx shadcn@latest add <component>
```

Do not hand-edit files in that folder — a later `add` will overwrite them, and they are
exempt from lint and formatting on purpose. Application components live outside it.

## 7. Testing

See [`TESTING.md`](TESTING.md) for the full strategy. The short version:

```bash
pnpm test                                   # unit and component tests
pnpm test -- src/core/money                 # one area
pnpm e2e                                    # end-to-end against the production build
pnpm e2e -- --headed                        # watch it run
```

Repositories are tested against `better-sqlite3` behind the same `Db` interface the browser
uses, so SQL behaviour is real without needing a browser.

## 8. Seed data

`pnpm seed --students 5000` lands in P2-5. Until then, create records through the UI or write
a fixture by hand in `e2e/fixtures/`.

## 9. Common tasks

**Add a UI component**

```bash
pnpm dlx shadcn@latest add table
```

**Add a table**

1. Write the migration in the owning module: `src/modules/<mod>/migrations/YYYYMMDDHHmm_<mod>_<desc>.sql`.
2. Register it in that module's `migrations` array.
3. Add a repository in `src/modules/<mod>/repositories/`.
4. Export the service from `src/modules/<mod>/index.ts`.

**Add a setting**

`settings` is a key/value table. Add the default to the settings module's defaults map and
the key to the settings documentation in `docs/DATA-MODEL.md`.

**Debug a UI problem**

1. Reproduce it with the Playwright MCP browser, or read `browser_console_messages`.
2. For a data problem, use GitNexus `query` and `context` to find the flow.
3. For the human's notes, check `agentation_get_all_pending`.

## 10. Offline guarantee

There must be no runtime network access: no analytics, no CDN, no remote fonts, no cloud APIs.
`e2e/smoke.spec.ts` asserts that the page contacts no host other than its own origin. If you
add a dependency that fetches anything at runtime, that test fails — and it should.

## 11. Security headers

`public/_headers` carries the Content-Security-Policy and the other hardening headers for
static hosts that read it (Netlify, Cloudflare Pages and compatible ones). Nginx and Apache
need the equivalent directives written out by hand.

The policy is `default-src 'self'` with `connect-src 'self'`. The plan (§10) suggests
`connect-src 'none'`; same-origin is used instead because the service worker must fetch its
own precached assets from the app's origin, and a `none` policy breaks offline start-up.
Everything else follows the plan exactly: no inline scripts, no plugins, no framing.

Serve these as HTTP headers, not as a `<meta http-equiv>` tag: a meta tag also applies in
development and would break Vite's HMR websocket.
