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

### D-010 Agent tooling is installed and committed to the repository

- **Decision:** Install seven Claude skills into `.claude/skills/` (committed), plus three MCP
  servers wired in `opencode.json`.
- **Why:** The user asked for a specific toolset. OpenCode discovers `.claude/skills/` as a
  project skill source, so the skills work for OpenCode and Claude Code alike.
- **Skills:** `frontend-design`, `ui-ux-pro-max`, `senior-frontend`, `code-reviewer`,
  `senior-architect`, `senior-backend`, `skill-creator`.
- **MCP servers:**
  - `playwright` — `@playwright/mcp`, headless and isolated, for driving the real app.
  - `gitnexus` — code knowledge graph, for blast radius and execution flows.
  - `agentation` — visual feedback from the human, annotated in the running app.
- **Impact:** `.claude/skills/` is ~35 files of Markdown and Python helper scripts. They are
  committed so every clone has them.

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

### D-014 The documentation set

- **Decision:** Nine documents under `docs/` plus `AGENTS.md` at the root.
- **Why:** `PLAN.md` is the source of truth but it is a plan, not a reference. The day-to-day
  questions — where does this file go, how do I write a repository, how do I test this — need
  their own answers that do not require reading 500 lines of plan.
- **Documents:** `PLAN`, `ARCHITECTURE`, `CONVENTIONS`, `DATA-MODEL`, `DEVELOPMENT`,
  `TESTING`, `UI-GUIDELINES`, `PROGRESS`, `DECISIONS`.
- **Impact:** `AGENTS.md` carries the document map, so an agent knows which file to open for
  which question.

---

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
