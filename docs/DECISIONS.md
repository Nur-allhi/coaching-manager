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

## 2026-11-16 — The five decisions the human made

### D-018 PR #1 is merged into `dev`

- **Decision:** The human chose "Merge into dev (squash)". PR #1 was squash-merged into
  `dev` at 08:33 UTC. The `docs/foundation-documents` branch was deleted by GitHub.
- **Why:** The governing document set is the foundation every later ticket depends on, so it
  lands on the integration branch first. It does **not** go to `main` until a release PR is
  prepared and separately confirmed.
- **Impact:** `dev` is now the branch to start working branches from.

### D-019 Commit format is enforced by Husky, commitlint and lint-staged

- **Decision:** Option A from `COMMIT_SYSTEM.md` §7. Four dev dependencies added: `husky`,
  `@commitlint/cli`, `@commitlint/config-conventional`, `lint-staged`.
- **Why:** The strongest feedback loop. The commit vocabulary is large enough that a scope
  typo is likely, and rejecting the message before it exists is cheaper than finding it in
  CI. The human chose this over commitlint-in-CI-only and a dependency-free hook script.
- **Configuration:** `commitlint.config.js` owns the scope allowlist, the 72-character subject
  limit and the forbidden-subject list — with a one-line reason pointing at
  `COMMIT_SYSTEM.md` §3. `lint-staged` in `package.json` runs ESLint and Prettier on staged
  files, so the pre-commit hook also upholds the cleanliness rules.
- **Impact:** `--no-verify` remains forbidden by `COMMIT_SYSTEM.md` §3.8.

### D-020 Commits are not signed

- **Decision:** No GPG or SSH commit signing for now.
- **Why:** The human chose the lighter setup. Branch protection does not require signatures.
- **Impact:** Revisit if the repository is ever subject to a provenance requirement.

### D-021 The repository has no licence

- **Decision:** No `LICENSE` file. The repository remains "all rights reserved".
- **Why:** The human's explicit choice.
- **Impact:** The third-party skills are not in the repository, so no `NOTICE` file is
  needed. If a licence is added later, it is a change to this decision.

### D-022 Branch protection on `main` and `dev` is kept

- **Decision:** Keep the protection that was applied (PR required, both CI jobs required,
  branch up to date, no force-push, no deletion, conversation resolution required, enforced
  on admins).
- **Why:** The Human confirmed it. Removing it would let working branches push straight to
  `dev`, which defeats the one-ticket-one-branch-one-PR system.
- **Impact:** The repository allows squash and merge commits but not rebase, because GitHub
  cannot set the merge method per branch. `BRANCHING.md` §7 documents which method belongs
  on which branch.

---

## 2026-11-16 — P0-2 findings

### D-023 sqlite-wasm worker spike: what works and what is still open

- **Decision:** Keep the locked choice from PLAN §3 — sqlite-wasm in a dedicated Worker, with
  the `opfs-sahpool` VFS. The spike confirmed that **no COOP/COEP headers are needed**: the
  app was served by plain `vite preview` with neither header, and both browsers worked.
- **Verified in Chromium:** create a table, insert a row, reload the page, the row survives;
  `exportBytes()` then `importBytes()` round-trips the same row; zero console errors; zero
  requests to any host other than the app's origin.
- **Verified in Firefox:** the same three checks pass.
- **Finding — WebKit on Linux has no working OPFS.** In the Playwright WebKit build used
  here, `navigator.storage.getDirectory()` throws
  `UnknownError: The operation failed for an unknown transient reason (e.g. out of memory)`
  and `FileSystemFileHandle.prototype.createSyncAccessHandle` is `undefined`. The sqlite
  specs are therefore skipped on WebKit with an explicit reason pointing at this entry; the
  WebKit smoke specs still run and pass.
- **Superseded (2026-11-16):** the human first accepted the unverified-Safari gap, then
  decided Safari is not a supported target at all. See D-026; this entry is kept for the
  OPFS finding and the verified Chromium/Firefox evidence, not as an open item.

---

## D-042 — T-041 Academics module design (2026-11-17)

- **Context:** T-041 builds the four academics entities (academic years, classes, subjects,
  batches) with full CRUD, a non-blocking schedule-clash warning and a non-blocking capacity
  warning. The tables and their relationships already exist from T-013's migrations; the
  academics `Screen.tsx` is still the T-016 placeholder. The audited repository helpers (T-015),
  the optimistic mutation hook (T-035) and typed settings service pattern (T-040) are available.
  No human is present, so REPO_RULES.md §1.1 is followed and the stated lean is taken
  autonomously under AUTONOMY.md §2.
- **Options surfaced, with concrete trade-offs and the lean for each:**
  - **A — Write layer.**
    - A1 — Use the generic `insert`/`update`/`softDelete`/`repoWithin` helpers with Zod validation
      at the module service boundary. All four tables carry the five COMMON columns, so the
      audited write path, optimistic version check and parent/child delete guard are reused with
      no new core code. Cost: `Row` is loosely typed, so Zod schemas must define the real shapes.
    - A2 — Hand-written bound SQL per entity, as settings does for its key/value table. Cost:
      duplicates audit/version/soft-delete logic already owned by core; more LOC and drift risk.
    - **Lean: A1.**
  - **B — Schedule-clash warning (same room, overlapping days and time).**
    - B1 — A service function `findBatchClashes(db, candidate)` returning the names of live
      batches in the same room, with an overlapping `days_mask` and overlapping time interval;
      the UI renders a non-blocking warning. Cost: one small query per form preview/save.
    - B2 — Compute clashes in the screen from an all-batches list. Cost: the rule lives in UI,
      is not unit-testable in isolation, and would be duplicated on any other batch form.
    - **Lean: B1.**
  - **C — Capacity warning (does not block save).**
    - C1 — A pure `capacityWarning(capacity, enrolledCount)` helper, with occupancy passed in by
      the caller. Academics never reads another module's table (TAD.md §2), so the screen passes
      0 until enrollments land in T-043. Cost: unit-testable now, visible in the UI only once a
      caller supplies real occupancy.
    - C2 — Count `enrollments` rows from inside academics. Cost: breaks module ownership and
      must be reworked when T-043 lands.
    - **Lean: C1.**
  - **D — Screen shape.**
    - D1 — One lazy `/academics` screen with four CRUD sections and a live warning preview on the
      batch form; split into section components to stay under 300 LOC per file. Cost: a larger
      feature split across several files.
    - D2 — One route per entity. Cost: conflicts with FRONTEND_SPEC.md §4's single `/academics`
      route and adds navigation churn.
    - **Lean: D1.**
  - **E — Verification.**
    - E1 — A real `academics.spec.ts` driving `/academics` in the browser (T-040 precedent).
      Cost: more selectors, but it proves the product surface.
    - E2 — A dev-only harness route. Cost: proves a test surface rather than the product.
    - **Lean: E1.**
- **Autonomous decision (T-041):** A1, B1, C1, D1, E1 — take all five leans.
- **Why:** reuses the one audited write path and optimistic mutation helper the architecture
  locks, keeps both warnings as testable pure/service logic, and verifies the real screen. No
  Locked Decision, schema convention, backup behaviour, test matrix or shared branch is touched.
- **Impact:** new `src/modules/academics/{types,service,repository,service.test,repository.test,
AcademicsScreen,*Section}.ts(x)`, the placeholder `Screen.tsx` becomes the real screen, and
  `e2e/specs/academics.spec.ts`; i18n keys in en+bn. No new dependency, migration or version bump.

---

## D-041 — T-040 Settings module design (2026-11-17)

- **Context:** T-040 is the first P2 ticket. The `settings` table (key/value/updated_at) exists
  from migrations but is unused. TAD §5.7 puts an editable grading scale in `settings` with a
  fixed default; TAD §11 locks TanStack Query + the shared optimistic mutation helper.
- **Decision (human, on the decision-advisor's recommendation):** A1 — a typed settings
  repository over the `settings` table with Zod validation at the boundary. B1 — TanStack Query
  `useQuery` to load + `useOptimisticMutation` to save (rollback on error). C2 — the grading
  scale is a fixed set of seven editable rows (label, min, max, points) matching the TAD default,
  stored as one JSON value under `grading_scale`; no add/remove of bands. D1 — the real Settings
  screen + `settings.spec.ts` changing the centre name and reloading.
- **Why:** closest fit to TAD's module ownership and locked state model; the fixed seven bands
  match the documented default exactly and avoid overlap-validation complexity.
- **Impact:** new `src/modules/settings/repository.ts` + defaults, real `Screen.tsx`, i18n keys in
  en+bn, `settings.spec.ts`. No new dependency. Writes go through audited repo helpers and the
  shared mutation helper.

## D-040 — T-035 Backups page and optimistic mutation helper (2026-11-17)

- **Context:** T-035 is the last P1 ticket: a real Backups page plus one shared optimistic
  mutation helper. TAD.md locks TanStack Query as the async/optimistic layer; `listSnapshots`
  has 10 upstream callers (CRITICAL) and must not change its signature.
- **Decision (human, on the decision-advisor's recommendation):** A1 — TanStack Query
  (QueryClientProvider + useQuery/useMutation). B1 — one `useOptimisticMutation` hook on
  `useMutation` with `onMutate`/`onError`/`onSettled` (rollback + refetch). C1 — persist the last
  file-export timestamp in `app_meta` (owned by data-tools per TAD) and show a dismissible
  banner when it is older than 7 days (FRONTEND_SPEC §5.1). D1 — build the real Backups screen
  in the data-tools module and drive it in `backups.spec.ts` with a test-only fixture route to
  seed/break data.
- **Why:** matches the locked architecture (no P2 rework); the timestamp is accurate because a
  file export is not a snapshot; the E2E exercises the real product page.
- **Impact:** QueryClientProvider in the app shell, new `useOptimisticMutation` hook, real
  `data-tools/Screen.tsx`, `app_meta` key for last export, test-only fixture route, E2E spec,
  i18n keys in en+bn. No new dependency — TanStack Query is already installed.

## D-039 — T-034 undo toast and History panel (2026-11-17)

- **Context:** T-034 needs a 10-second Undo toast after any mutation and a reusable History tab
  that restores a chosen version. `undo()` and `listHistory()` already exist from T-030; this is
  the UI layer. `sonner` is already a dependency but was not mounted.
- **Decision (human, on the decision-advisor's recommendation):** A1 — an imperative
  `showUndoToast(auditId, db, ctx)` helper wrapping sonner's `toast()` with a 10s Undo action;
  mount `Toaster` once in RootLayout. B1 — a dev route `/__undo` that runs real create/update/
  delete through the audited repo helpers so `undo.spec.ts` can drive the real browser flow
  (matching the T-031/032/033 harness precedent). C1 — a single generic `HistoryPanel`
  `{table, recordId}` that lists `listHistory()` and restores via `undo()` on the chosen entry.
- **Why:** lowest LOC and no new dependency; the core undo logic is already tested, so the UI is
  a thin layer; one History component avoids 9x duplication. The `onRestored`/`revision` props
  let the panel and its host stay in sync.
- **Impact:** new `undo-toast.ts`, `HistoryPanel.tsx`, `/__undo` harness, `undo.spec.ts`, i18n keys
  in en+bn, `Toaster` mounted in RootLayout, and a shared `makeAuditContext()` factory in
  `audit/write.ts` (previously callers built contexts inline). No new dependency.

## D-038 — T-033 portable file transfer design (2026-11-17)

- **Context:** T-033 needs a portable `.sqlite` export, optionally AES-GCM encrypted, that
  restores on a clean profile and fails on a wrong passphrase. PLAN.md §3 locks WebCrypto only;
  TAD.md §13 requires a `format_version` separate from the database `schema_version`.
- **Decision (human, on the decision-advisor's recommendation):** A1 — a single self-describing
  binary container (magic + format_version + JSON metadata {IV, salt, iterations, schemaVersion,
  SHA-256, byteLength} + ciphertext). B1 — PBKDF2-SHA-256 with a random 16-byte salt and 600,000
  iterations (consistent with the PIN policy), with the iteration count recorded in the header.
  C1 — the passphrase is a parameter of a pure crypto module, never collected via `window.prompt`
  inside it (UI prompt deferred to T-035).
- **Why:** one file needs no zip dependency; AES-GCM's auth tag makes a wrong passphrase fail;
  a pure module is testable with injected WebCrypto; the header records the KDF so the shipped
  default can change without breaking old files.
- **Impact:** new `crypto.ts`/`crypto-types.ts`/`file-transfer.ts`, a `importAsSnapshot` helper so
  imports reuse the T-032 restore path unchanged, a dev harness + E2E spec. No new dependency.
- **Known gap:** the showSaveFilePicker/download-writer choice is implemented in `nativeOrDownloadWriter`
  but only exercised by unit-level structure; the product UI that invokes it is T-035.

## D-037 — T-018 single-tab lock design (2026-11-17)

- **Context:** T-018 must refuse a second tab before it opens the one-connection OPFS VFS,
  show a lock screen, and release on unload. The app uses a React Router data router and renders
  from `main.tsx`.
- **Decision (human, on the decision-advisor's recommendation):** acquire the lock at bootstrap
  in `main.tsx` with a top-level `await navigator.locks.request('app-db-owner', { mode:
'exclusive', ifAvailable: true }, neverResolvingCallback)` (A1). A tab that cannot acquire it
  renders only `LockScreen` — no router, Worker or Db client is constructed (B1). A dev-only
  bypass skips the lock under `import.meta.env.DEV` to avoid a hot-reload self-deadlock.
- **Why:** the never-resolving callback holds the lock for the tab's lifetime and the browser
  releases it automatically on tab destruction (including a crash), satisfying acceptance (3)
  without an unreliable unload handler. The bootstrap gate makes "no DB call" true by
  construction. The lazy-in-getDb alternative still spawns the app tree and needs error plumbing.
- **Impact:** new `single-tab.ts` + `LockScreen.tsx`, strings in both locales, and a top-level
  await in `main.tsx`. No new dependency. Web Locks absent fails open (best-effort guard).

## D-032 — T-019 PWA persistence decisions (2026-11-16)

- **Context:** T-019 must request `navigator.storage.persist()` on first run and show the
  persistence status in Settings. PLAN.md §3 locks the PWA stack (`vite-plugin-pwa`/Workbox
  plus `persist()`); the manifest, icons and auto-registered worker already exist, so the open
  choices are when/how to request and how to surface the status.
- **Autonomous decision (T-019), taking the decision-advisor's leans:**
  - **A1** — request once at startup from `src/main.tsx`, remembering "first run" with a
    `localStorage` flag and an in-module in-flight promise guard; no Db/worker coupling.
  - **B1** — show a read-only persistence status row in the Settings screen, read from
    `navigator.storage.persisted()` when the screen mounts; no install or re-request control.
- **Why:** A1 satisfies "on first run" literally, before any data is created, and keeps the
  flag with the tiny UI state it describes. A3 would couple one boolean to the data-tools-owned
  `app_meta` and a worker that may not be ready at startup; A2 would never fire for an admin
  who does not open Settings. B1 meets the acceptance line with the smallest surface and does
  not pre-empt T-040's fuller Settings screen; B2/B3 add UI state and diagnostics outside this
  ticket.
- **Impact:** one small persistence helper and one status row. No new dependency, no schema or
  backup-behaviour change, and no change to the locked PWA stack or the test matrix.

## D-036 — T-032 restore decisions (2026-11-16)

- **Context:** T-032 must follow PLAN.md §7.3's order — validate, summarise, snapshot, restore —
  and leave the live database untouched when any step fails. T-031 already supplies snapshots,
  sidecars and the storage seam. The decision-advisor noted that adding a method to the locked
  worker RPC contract would need a human, so that route is not available overnight.
- **Autonomous decision (T-032), taking the advisor's leans:**
  - **A1** — validate with WebCrypto checksum, the SQLite file header and the sidecar's schema
    version against the app's; an optional injectable inspector runs `PRAGMA integrity_check` in
    unit tests. The locked `Db` worker contract is not changed.
  - **B1** — export the live bytes and write a forced `pre-restore` snapshot before importing the
    chosen file; the forced write is an explicit safety copy, not an automatically deduped one.
  - **C1** — keep the exported bytes and re-import them if `importBytes` throws, then rethrow.
  - **D1** — extend the existing `/__snapshots` dev harness with break-data/restore controls and
    a visible data count for the E2E spec (same reasoning as D-035 D1).
- **Why:** the four acceptance lines are met in a browser without touching a Locked Decision,
  the schema conventions or the backup/restore behaviour specified in §7.3.
- **Impact:** new `src/core/backup/restore.ts`, a small additive `force` option on snapshot
  creation, harness controls, an E2E spec and unit tests; no dependency, version bump or UI.

## D-035 — T-031 snapshot decisions (2026-11-16)

- **Context:** T-031 writes OPFS snapshots with a sidecar manifest, keeps the newest 10 and skips
  a snapshot when the database is unchanged. PLAN.md §7.3 fixes the filename, sidecar fields and
  rotation count; §11 locks WebCrypto SHA-256. `src/core/backup/` is still empty and the Vitest
  `Db` double has no OPFS. A decision-advisor surfaced two viable options per open choice.
- **Autonomous decision (T-031), taking the advisor's leans:**
  - **A1** — a small `SnapshotStorage` interface (list/read/write/remove) with an OPFS adapter.
    Unit tests inject an in-memory fake; no new dependency and the locked `Db` RPC surface is
    untouched.
  - **B1** — dedupe by comparing the WebCrypto SHA-256 of `exportBytes()` with the checksum in
    existing sidecars; no separate index file to keep in sync.
  - **C1** — sort the time-prefixed `YYYYMMDD-HHmmss_reason` names, keep the newest 10 and delete
    each older `.sqlite` together with its `.json` sidecar. A numeric suffix keeps names unique
    within one second.
  - **D1** — a small dev harness route `/__snapshots` with "change data" and "snapshot" controls
    and a visible count for the spec. Like `/__db-spike` (D-025) it is a test route under the
    router, not gated by `import.meta.env.DEV`, so the production-preview E2E can reach it.
- **Why:** one checksum source (the sidecar), deterministic rotation and a real-browser proof,
  with no schema, backup-spec, migration or Locked Decision change.
- **Impact:** new `src/core/backup/*`, one dev harness and route, an E2E spec plus unit tests;
  no version bump.

## D-034 — T-030 audit writer decisions (2026-11-16)

- **Context:** T-030 adds void writes, undo and the History plumbing on top of T-015's audit
  row writer. PLAN.md §3/§6 and TAD.md §12 fix the invariants: every write audits in the same
  transaction, undo applies the inverse and writes a **new** entry, and history is never
  rewritten. The action vocabulary is `create | update | delete | restore | void` — there is no
  `undo` action. A decision-advisor surfaced two viable options per open choice.
- **Autonomous decision (T-030), taking the advisor's leans:**
  - **A1** — void and restore helpers belong beside the repository write helpers; an orchestrator
    in `src/core/audit` reads an audit entry and applies its inverse. Core stays inside core and
    the one audited write path is reused.
  - **B1** — undo calls those helpers inside one `db.tx`, so each inverse write emits its own new
    audit row (`delete` / `update` / `restore`) and the original entry is left untouched. No
    dedicated `undo` action, no schema migration and no flipping of `undone`.
  - **C1** — undoing a create uses the existing soft-delete path, including its refusal when the
    record has live children. Business records are never hard-deleted and that parent/child rule
    is locked, so the undo fails loudly rather than bypassing it.
  - **D1** — `listHistory(db, table, id)` returns the stored entries with parsed before/after
    snapshots, giving T-034's History panel a data-only surface.
- **Why:** one audited write path, atomic void/undo with their audit rows, append-only history,
  and no new dependency, schema change or product behaviour change.
- **Impact:** additive helpers in `src/core/db/repository.ts`, a new `src/core/audit/undo.ts`,
  and unit tests; no UI, no migration, no Locked Decision or backup behaviour change.

## D-033 — T-020 i18n scaffold decisions (2026-11-16)

- **Context:** T-020 scaffolds i18next with English and Bangla. PLAN.md §3 locks the stack
  (i18next) but not the initial language, digit mechanism, resource format or key strategy.
  A decision-advisor surfaced two viable options for each; the autonomous run took the lean
  it could honestly stand behind (REPO_RULES.md §1.1, AUTONOMY.md §2).
- **Autonomous decision (T-020), by the run's own lean after the advisor:**
  - **D1 — initial language: English (Option A).** Option B (Bangla default, seed English in
    tests) was the advisor's lean and better matches FRONTEND_SPEC.md §1. Chosen A instead
    because T-020's own acceptance line says "Switching to Bangla translates the shell", every
    existing unit and Playwright spec asserts English strings, and a concurrent nightly session
    is landing another English-language spec (T-019). A Bangla default would break those specs
    in the same merge window for no product gain at this stage. Every user-visible string still
    has a Bangla resource, and the default is one constant in `src/core/i18n/index.ts` that the
    human can flip to `bn` without touching any component.
  - **D2 — Bangla digits: central helper (Option A).** `formatNumber(value, bengaliDigits)`
    in `src/core/i18n/numbers.ts` uses `Intl.NumberFormat('bn-BD')`, which already emits Bengali
    numerals and South Asian grouping. Rejected the i18next `format` override (invisible on raw
    numbers) and regex post-processing (corrupts ids and non-number digits). The flag is an
    independent localStorage setting, so switching language alone keeps Latin digits.
  - **D3 — resources: typed TypeScript objects (Option A).** `locales/{en,bn}.ts` give
    compile-time key checking and inline bundling, with no async loader and no runtime fetch —
    the offline guarantee is preserved. JSON (Option B) needs a loader and offers no typo safety.
  - **D4 — nav labels and route titles: dotted keys in manifests (Option A).** The 11
    `src/modules/*/index.ts` manifests store keys such as `nav.students`, translated in the
    shell; no parallel English field to drift. `registry.test.ts` asserts keys instead of labels.
- **Why:** one source of truth per string, no new dependency, no schema or backup change, and no
  change to the locked stack, the test matrix or any Locked Decision.
- **Impact:** new `src/core/i18n/*`, small edits to the shell, manifests and screens, two new
  unit suites and one E2E spec. No version bump.

## D-031 — Autonomous overnight build mode (2026-11-16)

- **Context:** the human wants the app built overnight without per-step confirmation: the
  agent decides on its own, retries on failure, and merges after green CI.
- **Decision (human, Option 1 full autonomy):** add `docs/AUTONOMY.md` defining autonomous mode
  (`AUTONOMOUS_MODE=true`, set only on scheduled runs). The agent follows §1.1 (two options and
  a lean) then takes its own lean and records it in `docs/DECISIONS.md`; auto-merge into `dev`
  only after both CI checks are green, branch up to date and both reviews PASS; retry a failed
  step up to three times then log a BUG and move on.
- **Hard safety line:** no `main` merge, release, version tag, branch delete, force-push,
  credential/permission/protection change, browser-target change, or Locked Decision change.
  Those tickets are skipped with a BUG. GitHub auto-merge is enabled on `dev` only.
- **Why:** removes the human from the loop while keeping every irreversible or shared-state
  action human-only. Normal interactive sessions keep the REPO_RULES §1 gates.
- **Impact:** new governing doc, two rule links, AGENTS/CLAUDE wiring, a nightly scheduled task
  in a fresh worktree with goal mode. No code changes.

## D-030 — Subagents act end-to-end without per-action prompts (2026-11-16)

- **Context:** after the subagents were installed, routine in-scope actions (`git branch`,
  `git switch`, `git push` to a feature branch, PR creation, e2e spec edits, release file edits)
  still used `ask`, so the human was prompted repeatedly. Several agents also lacked permissions
  their job requires (commit-writer could not run the mandatory GitNexus graph analysis;
  code-reviewer and security-auditor lacked `pnpm budget`/GitNexus; e2e-tester could not start a
  dev server).
- **Decision (human, "maximum"):** convert in-scope actions from `ask` to `allow` across all nine
  agents, including `git commit` and `git tag`, and add the missing tool permissions. Hard gates
  stay: no merge, no force-push, no branch delete, no push to `main`/`dev`, no secret output, no
  edits outside an agent's file. The user still confirms merges (REPO_RULES §1.3).
- **Why:** removes repeated prompts while preserving every action that can damage the shared
  branches or leak a secret. Agent bodies were updated to stop asking and act.
- **Impact:** six agent files changed; no shared config, no code, no new dependency.

## D-029 — T-017 error boundary and unsaved-changes guard (2026-11-16)

- **Context:** T-017 needs form values to survive a render error and an unsaved-changes guard
  that cannot be bypassed. The app uses `BrowserRouter`, whose `useBlocker` needs a data router.
- **Decision (human, on the decision-advisor's recommendation):** A1 — persist dirty form state
  to `sessionStorage` and restore it in the recovery UI, so values survive even when the global
  boundary unmounts the whole tree. B1 — migrate to `createBrowserRouter`/`RouterProvider` and
  use React Router's `useBlocker`, plus `beforeunload` for tab close/reload.
- **Why:** A2's guarantee is conditional on where the crash occurs; acceptance (2) is
  unconditional. B2's custom interceptor misses browser back/forward and any `navigate()` it
  does not wrap, which is not a real guard. The registry gives B1 one migration point and
  react-router v7 is already a dependency.
- **Impact:** router wiring moves to a data router; a form-state persistence helper and a
  global error boundary are added. No new dependency.

## D-028 — Smoke tagging is incremental (2026-11-16)

- **Context:** T-006 asked for `@smoke` on W1–W6, whose features and specs land in P2–P4 and do
  not exist yet.
- **Decision (human):** set up the tag infrastructure now — a `smoke` Playwright project with
  `grep: /@smoke/` and a CI step that runs it on pull requests — tag the specs that exist today,
  and tag each W1–W6 spec as it lands. Do not write placeholder journeys just to satisfy the
  acceptance line.
- **Impact:** the fast CI gate is real from now on; the W1–W6 part of T-006 completes
  incrementally with P2–P4.

## D-027 — Release workflow has scoped write permission (2026-11-16)

- **Context:** T-004 asked for a release workflow that publishes a GitHub release, while also
  saying every workflow uses `permissions: contents: read`. Creating a release needs write
  access, so the two lines conflict.
- **Decision (human):** add `.github/workflows/release.yml`, triggered on `v[0-9]*` tags, with
  `contents: write` scoped to the single release job. CI keeps `contents: read`. Release
  creation uses the runner's `gh` CLI with `GITHUB_TOKEN`, so no third-party action is added.
- **Impact:** the only write permission in the repo is this one job; every action stays pinned
  to a SHA. The CHANGELOG section for the tag becomes the release body via a script that fails
  if the tag has no section.

## D-026 — Safari is not a supported target (2026-11-16)

- **Context:** D-023 carried an unverified Safari/macOS gap and a Linux WebKit OPFS failure.
  PLAN.md §3 listed Safari 16.4+ as a browser that "must work", and `playwright.config.ts`
  still ran a WebKit project whose sqlite specs were skipped.
- **Decision (human):** remove Safari entirely. It is not a supported browser, not a test
  target, and not a blocker for any phase.
- **Impact:** the locked browser target in PLAN.md §3 and the P0-2 acceptance now name only
  Chrome and Firefox; `TICKETS.md` T-010 likewise. The WebKit project is removed from
  `playwright.config.ts` and the skip block from `sqlite-persistence.spec.ts`; the four
  previously skipped tests now run on Chromium and Firefox only. D-023 is closed.
- **Why:** the primary user is on Chrome/Edge at a counter; Safari is irrelevant to them, so
  maintaining a test target that cannot pass here and cannot be verified has no value.

## D-024 — T-015 owns the audit write; context is explicit (2026-11-16)

- **Context:** `docs/TICKETS.md` T-015 and T-030 both claimed "every write produces an audit
  row in the same transaction" with the same acceptance lines, which would make both tickets
  unverifiable independently.
- **Decision (human):** T-015 writes the audit row inside each repository helper's
  transaction. T-030 narrows to void, undo and the History plumbing. Audit context is an
  explicit `{ actorId, now, newId }` argument on every write, not a module-level setter.
- **Why:** one ticket owns one behavior, and explicit context has no shared mutable state to
  leak between sessions or tests.
- **Impact:** `src/core/audit/write.ts` and `repoWithin(t, ctx)` in the repository. T-030's
  acceptance must be updated before that ticket starts.

## D-025 — T-016 shell decisions (2026-11-16)

- **Context:** PLAN.md §3 and `FRONTEND_SPEC.md` lock the nav order, tokens, 240px
  sidebar→Sheet behaviour and route map, but not the routing mode or the T-016 route content.
- **Decision (human):** BrowserRouter (clean URLs; supported by `vite preview` and the PWA's
  `navigateFallback`); a shared `ModulePlaceholder` for each module's lazy route until the real
  screens land in T-020+; keep the `/__db-spike` harness, lazy, under the router until its
  removal is ticketed.
- **Why:** the preview server already does SPA fallback; placeholders satisfy the heading and
  lazy-chunk checks without throwing away real feature work; the spike still backs four green
  e2e tests.
- **Impact:** `src/app/routes.tsx`, `src/app/ModulePlaceholder.tsx`, one lazy screen per module.

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
