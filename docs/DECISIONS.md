# Decisions Log

Every entry records a choice, why it was made, and when. Decisions that touch
Locked Decisions (PLAN.md section 3), schema conventions (section 6) or backup and
restore (section 7.3) need the human's approval first.

Format: dated entries, newest last.

---

## 2026-11-16 — Toolchain setup (P0-1)

### D-001 TypeScript 5.9 instead of the just-released TypeScript 7

- **Decision:** Pin `typescript` to `~5.9.0`.
- **Why:** `typescript-eslint@8.72.2` declares peer `typescript >=4.8.4 <6.1.0`. TypeScript 7
  (the native Go port) is outside that range, so ESLint could not parse the sources and the
  `lint` script could not pass. TypeScript is not a Locked Decision beyond "strict", so the
  stable 5.9 line is used until the lint toolchain supports TS 7.
- **Impact:** None on the product. Revisit when `typescript-eslint` ships TS 7 support.

### D-002 `shadcn/ui` v4 CLI, `radix-nova` style, `radix-ui` package

- **Decision:** Use the current shadcn CLI (`style: "radix-nova"`, `base: radix`). Components
  import from the unified `radix-ui` package and `cn` from the `cn` package, as the CLI emits.
- **Why:** The plan locks "shadcn/ui (Radix)". The v4 CLI's Radix base matches that, and using
  the CLI's own emitted style keeps future `shadcn add` runs consistent with what is in the repo.
- **Impact:** 55 primitives in `src/components/ui/` (generated, excluded from lint and Prettier).

### D-003 `form` component is not in the `radix-nova` registry

- **Decision:** Build forms with React Hook Form + Zod directly (Locked Decision) and compose the
  new `field` primitives (`src/components/ui/field.tsx`) for markup. No `form.tsx`.
- **Why:** `shadcn add form` is a no-op on the `radix-nova` style; `field` is its replacement.
  The Locked Decision is about the form library, not the shadcn component, so nothing changes.

### D-004 Self-hosted fonts via `@fontsource`

- **Decision:** `@fontsource-variable/noto-sans` (Latin) and `@fontsource/noto-sans-bengali`
  (weights 400/500/700) are bundled by Vite. No CDN, no remote font request.
- **Why:** The plan requires a self-hosted Noto Sans Bengali font and forbids remote fonts at
  runtime. The shadcn preset defaults to Geist; Noto was substituted.
- **Impact:** Bangla conjuncts shape correctly in the browser and in print routes.
  `:lang(bn)` is pinned to the Bengali family.

### D-005 Strictness flags beyond `strict: true`

- **Decision:** Added `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`,
  `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`,
  `forceConsistentCasingInFileNames`.
- **Why:** "TypeScript (strict)" in the plan. `noUncheckedIndexedAccess` matters here because
  money and allocation code indexes arrays and maps that may be short.
- **Impact:** `exactOptionalPropertyTypes` was deliberately left off: it fights React and
  React Hook Form prop types without adding safety for this codebase.

### D-006 `tsc -b` with three project references

- **Decision:** Root `tsconfig.json` references `tsconfig.app.json` (src), `tsconfig.node.json`
  (vite/playwright config, scripts) and `tsconfig.e2e.json` (e2e specs).
- **Why:** Playwright specs and build scripts must not be type-checked with DOM-only app libs, and
  `tsc -b` gives one command for all three.

### D-007 Vite 8 uses Rolldown, so `manualChunks` is a function

- **Decision:** `build.rollupOptions.output.manualChunks` is a function, not an object map.
- **Why:** Vite 8 (Rolldown) types only accept the function form.

### D-008 The `shadcn` CLI resolves `@/*` from the root `tsconfig.json`

- **Decision:** The root `tsconfig.json` carries `compilerOptions.baseUrl` and
  `compilerOptions.paths` in addition to its project references.
- **Why:** Without them the CLI resolved `@/components/ui` literally and wrote files into a
  stray `./@/components/ui/` directory instead of `src/components/ui/`.

### D-009 `pnpm` installed globally with npm; no Corepack

- **Decision:** `npm i -g pnpm@10` (pnpm 10.34.9), pinned via the `packageManager` field.
- **Why:** Corepack is not present on this machine and Node 24 no longer ships it enabled.

---

## 2026-11-16 — Agent tooling and project documentation

### D-010 Agent tooling is installed and wired up

- **Decision:** Install seven Claude skills into `.claude/skills/`, plus three MCP servers
  wired in `opencode.json`.
- **Why:** The user asked for a specific toolset. OpenCode discovers `.claude/skills/` as a
  project skill source, so the skills work for OpenCode and Claude Code alike.
- **Skills:** `frontend-design`, `ui-ux-pro-max`, `senior-frontend`, `code-reviewer`,
  `senior-architect`, `senior-backend`, `skill-creator`.
- **MCP servers:**
  - `playwright` — `@playwright/mcp`, headless and isolated, for driving the real app.
  - `gitnexus` — code knowledge graph, for blast radius and execution flows.
  - `agentation` — visual feedback from the human, annotated in the running app.
- **Impact:** The skills are on disk and loaded by the agent, but they are **not** committed
  — see D-015.

### D-011 GitNexus index lives in `.gitnexus/` and is git-ignored

- **Decision:** `pnpm exec gitnexus analyze` writes the index to `.gitnexus/`, which ignores
  itself. `AGENTS.md` and `CLAUDE.md` carry the generated GitNexus block between
  `<!-- gitnexus:start -->` markers.
- **Why:** The index is derived data — rebuildable with one command — and it is large. The
  markers let `gitnexus` regenerate its own section without touching the rest of the file.
- **Impact:** `AGENTS.md` is now the working agreement _and_ the GitNexus instructions.
  `CLAUDE.md` is a byte-identical mirror.

### D-012 The Agentation toolbar is dev-only and lazily imported

- **Decision:** `src/app/dev/DevFeedback.tsx` is loaded with `React.lazy` behind an
  `import.meta.env.DEV` check, so the production bundle contains neither the component nor its
  chunk.
- **Why:** It is a development feedback tool, not a product feature. Shipping it would add a
  floating button to the admin's screen.
- **Impact:** `pnpm build` output contains no `agentation` code. Verified by inspecting the
  built bundle.

### D-013 MCP servers are configured project-locally

- **Decision:** `opencode.json` at the repository root holds the MCP server definitions with
  `cwd: "."` and relative `node_modules` entry points.
- **Why:** The global config can only hold one `gitnexus` entry, and it would point at an
  absolute path into this project. A project config travels with the repository and is
  overridden per directory.
- **Impact:** `gitnexus setup --coding-agent opencode` also added a global entry and 12
  GitNexus skills to `~/.config/opencode/skills/`. The project entry takes precedence. The
  global entry can be removed with `pnpm exec gitnexus uninstall`.

### D-014 The governing document set

- **Decision:** Eleven documents under `docs/` govern the project, alongside `AGENTS.md`,
  `CHANGELOG.md` and `session_log.md` at the root.
- **Why:** `PLAN.md` is a plan, not a reference. The day-to-day questions — where does this
  file go, how do I write a repository, how do I test this, may I merge this — each need an
  answer that does not require reading five hundred lines of plan.
- **The set:** `PRD` (what it is for), `TAD` (how it is built), `SECURITY` (what is
  protected), `FRONTEND_SPEC` (how it looks and behaves), `TICKETS` (the execution queue),
  `REPO_RULES` (the process and the code conventions), `BUGS` (the known-issue queue),
  `BRANCHING`, `COMMIT_SYSTEM`, `VERSIONING` (the git contract), and `E2E_TESTING` (the
  Playwright protocol). `PLAN`, `PROGRESS`, `DECISIONS` and `DEVELOPMENT` sit alongside them.
- **Single source of truth:** each rule lives in exactly one document. Other documents link
  to it and never restate it.
- **Impact:** five earlier documents — `ARCHITECTURE`, `CONVENTIONS`, `DATA-MODEL`,
  `UI-GUIDELINES` and `TESTING` — were retired and their rules folded into the new set, so
  no rule is stated twice.

### D-015 Third-party skills stay out of the repository

- **Decision:** `.claude/skills/` is git-ignored, and the directory was removed from every
  commit in the history, not only from the tip.
- **Why:** The skills come from `aitmpl.com` and the GitNexus project. Two carry an explicit
  MIT or Apache-2.0 licence and the rest declare no licence at all. Publishing files whose
  licence status is unknown under someone else's repository is not ours to do. They stay
  installed on disk for local use.
- **Impact:** The history was rewritten with `git filter-branch --index-filter` before the
  first push, and the orphaned objects were garbage-collected, so the skills are absent from
  the published repository entirely. `AGENTS.md` and `CLAUDE.md` still name them, because
  they are installed locally and the working agreement should describe the local setup.

### D-016 CI hardening: pinned actions and least privilege

- **Decision:** Every GitHub Action is pinned to a commit SHA with the version in a trailing
  comment, and the workflow declares `permissions: contents: read`.
- **Why:** A tag is a mutable pointer. If an action's repository were compromised, a moving
  tag would pull the malicious commit into every run of every fork. Pinning to a SHA runs the
  exact audited code. Least privilege means a compromised step cannot push to the repository.
- **Impact:** Updating an action means bumping the SHA deliberately. The workflow uses no
  secrets and no write scopes, so a pull request from a fork can do nothing but run the
  build. The first run against the real repository passed on 2026-11-16
  (run `43827123710`, both jobs green), which confirms the pinned SHAs and the action input
  schema.

### D-017 CSP is served as headers, and `connect-src` is `'self'`

- **Decision:** `public/_headers` carries the CSP and the other hardening headers.
  `connect-src` is `'self'` rather than the plan's `'none'`.
- **Why:** The service worker must fetch its own precached assets from the app's origin; a
  `connect-src 'none'` policy blocks that and breaks offline start-up. Nothing else is
  allowed to connect, so the intent of the rule — no third-party calls, ever — still holds.
- **Impact:** The policy is delivered as an HTTP header, not a `<meta http-equiv>` tag,
  because a meta tag also applies in development and would break Vite's HMR websocket.
  `style-src` allows `'unsafe-inline'` because Radix positions overlays with inline style
  attributes, which CSP cannot express any other way. Verify the policy against the live
  worker and service worker in P0-6.

---

## Open decisions carried from PLAN.md section 4

These use the plan's defaults. They become implemented in the phase noted.

| Decision           | Default in use                                                        | Implemented in |
| ------------------ | --------------------------------------------------------------------- | -------------- |
| Currency           | BDT, integer paisa (`amount_minor`)                                   | P0-5           |
| Fee model          | One-time admission fee + monthly fee per enrollment                   | P3-1           |
| Discounts          | Fixed or percent per enrollment, optional per-charge discount         | P3-1           |
| Ranking ties       | Competition ranking (1, 2, 2, 4)                                      | P4-4           |
| Absent in exam     | Counts as 0 in totals, flagged, excluded from averages                | P4-2           |
| Leaderboard scopes | Per exam / month / academic year, filtered by batch or class          | P4-4           |
| Grading scale      | A+ 80-100 (5.00) down to F below 33 (0), editable in settings         | P4-3           |
| Receipt number     | `R-YYYY-000001`, sequential, never reused                             | P3-2           |
| Student number     | `YYYY-0001` by admission year                                         | P2-3           |
| Edit policy        | Admin may edit anything; every edit audited; REVISED mark on receipts | P1-1 / P3-3    |
| Backups            | Newest 10 kept, checksum dedupe, snapshots at the five listed points  | P1-2 / P1-3    |
| Auth               | Single admin PIN of 6+ digits, enabled in P6                          | P6-1           |
