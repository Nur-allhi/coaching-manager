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

## D-050 — T-054 Receipt print route and Excel export (2026-11-17)

- **Context:** T-054 adds `/print/receipt/:paymentId` (A5, Bangla, QR, balance due, VOID/DUPLICATE/
  REVISED marks) and an Excel export of receipts. PLAN.md §3 locks ExcelJS for Excel and self-hosted
  Bengali fonts; no QR library or print infrastructure is installed. D-048 already supplies the
  receipt number, `status`, `revision` and an in-app preview. No human is present, so REPO_RULES.md
  §1.1 is followed and the stated lean is taken autonomously under AUTONOMY.md §2.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Receipt data.** A1 — a payments service reads the payment, its allocation months (its own
    tables) and student/batch names through the owning modules' public APIs (TAD.md §2). A2 — join
    all tables directly from the print route. **Lean: A1.**
  - **B — QR code.** B1 — add the small `qrcode` package and render a data URL from the receipt
    number. B2 — hand-roll a QR encoder. **Lean: B1** (B2 is large, error-prone code we would own).
  - **C — Excel export.** C1 — add `exceljs` (the PLAN §3 locked choice), lazy-imported so it stays
    out of the initial bundle; write UTF-8 strings so Bangla opens correctly. C2 — ship CSV only.
    **Lean: C1** (C2 fails the ticket's Excel acceptance line).
  - **D — Print layout.** D1 — a receipt-only `@page { size: A5 }` stylesheet with absolutely
    positioned VOID / DUPLICATE / REVISED n watermarks and a print button. D2 — reuse the app's A4
    global styles. **Lean: D1.**
  - **E — Balance due after payment.** E1 — the student's current dues from `duesForStudent` at print
    time. E2 — a new historical balance column on each payment. **Lean: E1** (E2 is a schema change;
    the printed figure matches the dues module and the ticket's E2E compares against it).
  - **F — Verification.** F1 — unit tests for receipt fields and export rows, plus `receipt.spec.ts`
    opening the real print route and asserting every required field and the download event. F2 — E2E
    only. **Lean: F1.**
- **Autonomous decision (T-054):** A1, B1, C1, D1, E1, F1 — take all six leans.
- **Why:** the data and display stay in the owning payments module, the two new dependencies are the
  locked ExcelJS plus a small QR renderer (both lazy/on-demand so the 300 KB budget holds), and the
  printed balance uses the same dues rule the rest of the app uses. No Locked Decision, schema
  convention, backup behaviour, test matrix or shared branch changes; adding a dependency is not in
  AUTONOMY.md §3. Version impact is `minor` (a `feat`).
- **Impact:** two prod dependencies (`exceljs`, `qrcode`) plus a lockfile update, new
  receipt-service/export/print component and A5 stylesheet in payments, a `/print/receipt/:id` route,
  en/bn keys, unit tests, `receipt.spec.ts`, and D-050 / PROGRESS / CHANGELOG / session log.

---

## D-049 — T-053 Dues list and student Payments tab (2026-11-17)

- **Context:** T-053 adds the `/payments/dues` list with batch/class/amount filters, requires its
  totals to match the payments module for the same range, excludes students with no dues, and makes
  the Payments tab on the student profile real. `duesForStudent` already defines net due from valid
  payments; `listStudents`, `listBatches` and (new) `listClasses` are public module reads. No human
  is present, so REPO_RULES.md §1.1 is followed and the stated lean is taken autonomously.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Dues data source.**
    - A1 — a payments-owned `duesReport` service aggregating charges minus valid-payment allocations
      over payments' own tables, enriched with student/batch/class names through the owning modules'
      public `index.ts` (TAD.md §2). Cost: one additive `listClasses` export in academics.
    - A2 — a read-model query in the reports module. Cost: reports is read-only over all tables but
      does not own dues, so the rule would live in the wrong module.
    - **Lean: A1.**
  - **B — Filters.**
    - B1 — batch, class and min/max amount filters applied to the service result in the screen,
      rendered with the established TanStack Virtual row pattern (REPO_RULES §7.6 #19). Cost: the
      aggregation reads all live dues once per query; bounded by live students with dues.
    - B2 — server-side parameterised filters. Cost: four SQL variants and no need behind them at
      this data size.
    - **Lean: B1.**
  - **C — Student Payments tab.**
    - C1 — export a `StudentPaymentsTab` component from the payments public `index.ts` and render it
      from `StudentProfile` for the `payments` tab. The data access and receipt display stay in the
      owning module (TAD.md §2); the student profile only supplies the student id.
    - C2 — let the students module query payments data and render the table itself. Cost: payments
      display logic (receipt, status, revision) duplicated outside the owning module.
    - **Lean: C1.**
  - **D — Totals consistency.**
    - D1 — one SQL aggregation for the report and a unit test asserting its total equals the sum of
      `duesForStudent` for every student in the fixture. Cost: one subquery.
    - D2 — reuse the per-student function in a loop. Cost: N queries for 5,000 students.
    - **Lean: D1.**
  - **E — Verification.**
    - E1 — unit tests (totals match, batch/class/amount filters, no-dues excluded) plus a
      `dues.spec.ts` with a fixture seeding students across two batches and classes, and an E2E
      assertion on the student Payments tab. Cost: one test-only fixture route.
    - E2 — E2E only. Cost: the totals-consistency rule needs fast unit coverage.
    - **Lean: E1.**
- **Autonomous decision (T-053):** A1, B1, C1, D1, E1 — take all five leans.
- **Why:** dues stay owned by payments, names arrive through public module surfaces, one aggregation
  keeps the report total identical to the per-student rule, and the profile tab reuses the owning
  module's component. No Locked Decision, schema convention, backup/restore behaviour, test matrix
  or shared branch changes. Version impact is `minor` (a `feat`).
- **Impact:** additive `duesReport` service/repository functions in payments, a `listClasses` export
  in academics, a `/payments/dues` screen and route, a `StudentPaymentsTab` component rendered by
  the student profile, a test-only fixture, en/bn keys, unit tests, two E2E specs, and D-049 /
  PROGRESS / CHANGELOG / session log. No new dependency or migration.
- **Size note:** the branch carries roughly 1,000 changed lines, past BRANCHING.md §3.4's _rough_
  800-line split hint. The excess is almost entirely new files the single atomic ticket requires —
  two E2E/fixture files, three report/tab source files, unit tests and the two split locale-namespace
  files needed for the 300-LOC rule. Splitting would break the stronger one-ticket-one-branch-one-PR
  rule in TICKETS.md, so this autonomous run keeps one PR and records the judgement here.

---

## D-048 — T-052 Edit and void a payment (2026-11-17)

- **Context:** T-052 edits a recorded payment (re-run allocation, increment `revision`, keep the
  receipt number) and voids one (keep the row and number, allocations stop counting). `payments`
  already carries `status`, `revision` and a gapless `receipt_no` (T-051); `voidRecord` (T-030) and
  the audited `repoWithin` helpers (T-015) exist. No human is present, so REPO_RULES.md §1.1 is
  followed and the stated lean is taken autonomously under AUTONOMY.md §2.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Where edit/void live.**
    - A1 — extend the real `/payments` collect screen with a "Recent payments" section: a list of
      recorded payments with Edit and Void actions, an inline edit form, and REVISED/VOID receipt
      markers. Cost: one more component to keep under 300 LOC.
    - A2 — dedicated `/payments/:id/edit` and receipt-list routes. Cost: more routes than the
      FRONTEND_SPEC §4 map and a larger E2E surface.
    - **Lean: A1.**
  - **B — Re-allocation on edit.**
    - B1 — in one `db.tx`, delete this payment's allocations (each audited), update the payment row
      through `repoWithin.update` with `revision = revision + 1`, then re-allocate oldest-first to
      the currently open charges. Cost: one ordered query and a bounded write loop.
    - B2 — diff only the allocation rows that change. Cost: more bookkeeping with no requirement
      behind it.
    - **Lean: B1.**
  - **C — Receipt identity and markers.**
    - C1 — never change `receipt_no`; increment `revision`; surface `REVISED n` and `VOID` as
      i18n-keyed markers in the real UI, plus a receipt preview on the recent-payments row that
      shows the receipt number, revised mark and explicit `Revision n` count so the "shown on the
      reprinted receipt" line is met here. The A5 `@page` print layout, QR, balance due and Excel
      export consume these same fields and belong to T-054. Cost: the A5 layout itself is not
      shipped here.
    - C2 — a separate revisions table. Cost: new schema and reconciliation with no benefit.
    - **Lean: C1.**
  - **D — Void semantics.**
    - D1 — a thin payments-service wrapper over core `voidRecord`, which sets `status = 'void'` and
      leaves the row and allocations intact; `openCharges` already excludes void payments'
      allocations, so they stop counting with no new query. Cost: a void payment cannot be edited.
    - D2 — delete the allocations on void. Cost: loses the history the receipt number is meant to
      preserve.
    - **Lean: D1.**
  - **E — Verification.**
    - E1 — unit tests (receipt unchanged, revision bump, re-allocation changes dues, void stops
      allocations counting, rollback on failure, version conflict) plus an extended
      `payments.spec.ts` that edits and voids through the real screen. Cost: a small fixture change.
    - E2 — E2E only. Cost: money/allocation edge cases need fast unit coverage.
    - **Lean: E1.**
- **Autonomous decision (T-052):** A1, B1, C1, D1, E1 — take all five leans.
- **Why:** one transaction covers the edit, its audit rows and the re-allocation; the receipt keeps
  its identity while the revision records how many edits happened; void reuses the existing audited
  helper and needs no new query because the valid-payment filter already governs counting. No
  Locked Decision, schema convention, backup/restore behaviour, test matrix or shared branch changes.
  Version impact is `minor` (a `feat`).
- **Impact:** additive service functions and repository helpers in `src/modules/payments/*`, a new
  recent-payments component with a receipt preview, an extended `/payments` screen and fixture,
  en/bn keys, unit tests and `payments.spec.ts`, D-048/PROGRESS/CHANGELOG/session log. No new
  dependency or migration. The A5 `@page` print layout (QR, balance due, Excel) stays in T-054;
  allocation-level undo remains out of scope (no UI path reaches it).

---

## D-047 — T-051 Record payment with allocation (2026-11-17)

- **Context:** T-051 records partial, advance and multi-month payments with allocation and receipt
  numbering, all in one transaction. `payments`, `payment_allocations` and the `counters` table
  exist; T-050 generates charges. No human is present, so REPO_RULES.md §1.1 is followed and the
  stated lean is taken autonomously.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Receipt numbers.**
    - A1 — increment a `counters` row inside the payment's `db.tx` with
      `UPDATE ... SET value = value + 1 ... RETURNING value`; format `R-YYYY-000001`. A rollback
      reverts the increment, so numbers stay gapless. `counters` is owned by payments (TAD.md §7).
    - A2 — derive from `MAX(receipt_no)`. Cost: a void or rolled-back payment leaves a gap.
    - **Lean: A1.**
  - **B — Allocation.**
    - B1 — allocate to charges oldest first (admission, then months in order), each capped by the
      charge's net due and the payment's remaining amount; the unallocated remainder is an
      advance. One transaction with the payment row and receipt number. Cost: an explicit ordered
      query per payment.
    - B2 — allocate proportionally across all dues. Cost: complexity with no requirement behind it.
    - **Lean: B1.**
  - **C — Advance.**
    - C1 — keep the unallocated remainder on the payment and, when T-050's generator creates new
      charges, allocate spare capacity from earlier valid payments to the new charges in the same
      transaction. Cost: the generator calls the payments allocator (same module, no ownership
      issue).
    - C2 — store a separate advance ledger table. Cost: new schema and reconciliation logic.
    - **Lean: C1.**
  - **D — UI.**
    - D1 — a real `/payments` collect screen: student selector, amount, method, live dues preview
      and the committed receipt number. Cost: one UI ticket's worth of code.
    - D2 — a backend-only ticket with no screen. Cost: fails the ticket's E2E acceptance line.
    - **Lean: D1.**
  - **E — Verification.**
    - E1 — unit tests (allocation cap, gapless numbers, advance auto-allocation, partial remainder)
      plus `payments.spec.ts` with a fixture route driving the real collect screen. Cost: one
      fixture route.
    - E2 — E2E only. Cost: money/allocation edge cases need fast unit coverage.
    - **Lean: E1.**
- **Autonomous decision (T-051):** A1, B1, C1, D1, E1 — take all five leans.
- **Why:** one transaction covers the number, payment and allocations; the oldest-first greedy
  allocation is bounded by both payment and charge; advances are reused without a new table; and
  both the unit and e2e layers verify real behaviour. No Locked Decision, schema convention,
  backup behaviour, test matrix or shared branch changes. Version impact is `minor` (a `feat`).
- **Impact:** `src/modules/payments/{payments-repository,payment-service}.ts`, an additive change to
  T-050's generator to auto-allocate advances, the real `/payments` screen, a test-only fixture
  route, `e2e/specs/payments.spec.ts`, unit tests, en/bn keys, D-047/PROGRESS/CHANGELOG/session log.
  No new dependency or migration.

---

## D-046 — T-050 Fee rules and monthly charge generation (2026-11-17)

- **Context:** T-050 generates an admission charge and a monthly charge per active enrollment,
  with fixed/percent discounts, idempotently. The `charges` table exists with
  `UNIQUE(enrollment_id, month, kind)`, but SQLite treats NULLs as distinct, so two admission
  charges (month NULL) would not conflict. There is no UI in this ticket (E2E: n/a). No human is
  present, so REPO_RULES.md §1.1 is followed and the stated lean is taken autonomously.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Idempotency guard for the NULL-month admission charge.**
    - A1 — add an **append-only** UNIQUE expression index on
      `(enrollment_id, COALESCE(month, ''), kind)` and use `INSERT ... ON CONFLICT DO NOTHING`.
      The unique key — not a flag — prevents duplicates, per the acceptance line. Cost: one
      migration; the original constraint stays for non-NULL months.
    - A2 — store the admission month as the empty-string sentinel. Cost: contradicts the
      documented "NULL for one-off" convention for `charges.month`.
    - **Lean: A1.**
  - **B — Admission charge.**
    - B1 — one `admission` charge per enrollment, `amount_minor = admission_fee_minor`, no
      discount; generated even when zero so the key is uniform. Cost: a zero-value row for the
      common default.
    - B2 — skip zero admission fees. Cost: admission is absent from the charge list to which
      T-051 allocates payments.
    - **Lean: B1.**
  - **C — Monthly discount.**
    - C1 — store gross `amount_minor` and the computed `discount_minor`, using the core helpers
      (`applyPercentDiscount` rounds once to the paisa; `netAmount` gives the net). Cost: the UI
      must show gross, discount and net.
    - C2 — store only the net amount with a zero discount. Cost: loses the discount the admin
      entered and cannot reprice on edit.
    - **Lean: C1.**
  - **D — Generator scope.**
    - D1 — `generateCharges(db, month)` plus a per-enrollment variant, each idempotent. Cost: two
      entry points, both small.
    - D2 — generate every month in one call. Cost: unbounded work and no natural batching.
    - **Lean: D1.**
  - **E — Verification.**
    - E1 — unit tests against `better-sqlite3`: run twice → no duplicates, percent discount to the
      paisa, and a direct duplicate insert refused by the unique key (not a flag). Cost: no E2E,
      but this ticket declares E2E n/a.
    - E2 — a dev harness route. Cost: out of scope for a backend ticket.
    - **Lean: E1.**
- **Autonomous decision (T-050):** A1, B1, C1, D1, E1 — take all five leans.
- **Why:** the unique key enforces idempotency for both NULL and dated charges, money stays in
  integer paisa with a single rounding, and the generator is bounded to one month. The migration
  is append-only and follows the schema conventions; no Locked Decision, backup behaviour, test
  matrix or shared branch changes. Version impact is `minor` (a `feat` commit).
- **Impact:** one append-only migration in `src/modules/payments/migrations/`, a payments
  repository/service and unit tests, registration in the migration registry plus the hard-coded
  schema-version test constants, en/bn keys if any string surfaces (none in this backend ticket).
  No new dependency.

---

## D-045 — T-044 Seed generator design (2026-11-17)

- **Context:** T-044 needs `pnpm seed --students 5000` producing a deterministic dataset usable by
  the performance and e2e suites. The database lives in the browser (OPFS), so a Node CLI cannot
  write to it directly. `docs/DEVELOPMENT.md` §8 already reserves this ticket. No human is present,
  so REPO_RULES.md §1.1 is followed and the stated lean is taken autonomously.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Randomness.**
    - A1 — a small seeded PRNG (mulberry32) with a fixed default seed; every field derives from
      `(seed, index)`, so two runs are byte-identical. Cost: ~10 lines of PRNG we own.
    - A2 — add a faker-style dependency with a seed. Cost: a new dependency, lockfile churn and an
      extra CI install for data a few lines of PRNG can produce.
    - **Lean: A1.**
  - **B — Where rows are produced.**
    - B1 — a pure `scripts/seed-data.ts` generator imported by the CLI, Vitest benchmarks and
      Playwright specs; no dependency on DOM or Node APIs. Cost: the CLI runs under Node's built-in
      TypeScript type stripping (Node 24, already the repo's version).
    - B2 — a browser-only generator injected through a dev route. Cost: the CLI could not produce
      a dataset at all, failing the ticket's primary acceptance line.
    - **Lean: B1.**
  - **C — CLI output.**
    - C1 — `pnpm seed --students N [--seed S] [--out FILE]` writes a JSON file under the ignored
      `test-results/` by default and prints a one-line summary; no repository pollution. Cost:
      tests that want in-memory rows import the pure generator instead of reading the file.
    - C2 — write into a checked-in fixture file. Cost: a generated 5,000-row file in git on every
      run.
    - **Lean: C1.**
  - **D — Use by the suites.**
    - D1 — replace the hand-built benchmark rows in `students/repository.test.ts` with rows from
      the generator, and add an e2e seed spec that injects generated rows through the existing
      test-only fixture route, asserting the list renders them. Cost: a small fixture-route helper.
    - D2 — leave the suites as they are and ship only the CLI. Cost: fails the "used by the
      performance and e2e suites" acceptance line.
    - **Lean: D1.**
- **Autonomous decision (T-044):** A1, B1, C1, D1 — take all four leans.
- **Why:** determinism comes from a pure function the suites can import, the CLI needs no new
  dependency, generated files stay out of git, and both named suites actually consume the data.
  No Locked Decision, schema convention, backup behaviour, test matrix or shared branch changes;
  version impact is `none` (script + docs + tests only).
- **Impact:** new `scripts/seed-data.ts`, `scripts/seed.ts`, an updated `package.json` script and
  `docs/DEVELOPMENT.md` script table, a unit test for determinism, and small edits to the students
  performance test and an e2e fixture/spec. No product code, schema or version bump.

---

## D-044 — T-043 Enrollments and batch transfer design (2026-11-17)

- **Context:** T-043 adds enrollment, transfer between batches, fixed/percent discounts and a
  leave date. The `enrollments` table already exists with `status`, `left_on`, `discount_kind` and
  `discount_value`. TAD.md §7 lets `enrollments` read `students` and `batches`, but TAD.md §2 says
  it must do so through the owning module's public `index.ts`, not its tables. No human is
  present, so REPO_RULES.md §1.1 is followed and the stated lean is taken autonomously.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Transfer.**
    - A1 — in one `db.tx`, close the old enrollment (audited update: `status='closed'`, `left_on`,
      version bump) then create the new enrollment (audited insert). The old row is never deleted,
      so history is preserved. Cost: two audit rows per transfer.
    - A2 — delete the old row and insert a new one. Cost: violates soft-delete and loses history.
    - **Lean: A1.**
  - **B — Capacity warning.**
    - B1 — count the target batch's live active enrollments (own table) and read `capacity` via a
      new public `listBatches()` export from the academics module's `index.ts` (TAD.md §2). The
      warning is non-blocking. Cost: one small additive export in academics.
    - B2 — query the `batches` table directly from enrollments. Cost: breaks module ownership.
    - **Lean: B1.**
  - **C — Discounts.**
    - C1 — keep the documented `discount_kind` union (`none|fixed|percent`) and an integer
      `discount_value` (paisa for fixed, whole percent otherwise), validated by Zod and displayed
      with the core money helpers. Cost: the UI switches display by kind.
    - C2 — store only a precomputed net amount. Cost: discards the discount the admin entered;
      conflicts with the schema.
    - **Lean: C1.**
  - **D — Fee defaults.**
    - D1 — prefill the monthly fee from the batch's `monthly_fee_minor` (academics public API),
      overridable per enrollment; admission fee defaults to zero. Cost: one extra read.
    - D2 — require manual entry of both fees. Cost: needless typing and drift from the batch.
    - **Lean: D1.**
  - **E — Verification.**
    - E1 — a real `enrollments.spec.ts` with a small test-only fixture route seeding a student and
      two batches, then driving the real enrollment screen for enroll and transfer. Cost: one
      fixture route.
    - E2 — drive the students and academics UI to build prerequisites. Cost: brittle coupling to
      two other modules' screens.
    - **Lean: E1.**
- **Autonomous decision (T-043):** A1, B1, C1, D1, E1 — take all five leans.
- **Why:** one transaction guarantees a transfer either closes-and-opens or does nothing; the
  capacity warning reads only through the owning module's public surface; discounts keep their
  documented representation; fees default sensibly without hard-coding another module's data.
  No Locked Decision, schema convention, backup behaviour, test matrix or shared branch changes.
- **Impact:** new `src/modules/enrollments/*` service/repository/UI files, one additive
  `listBatches` export in `src/modules/academics/index.ts`, `e2e/specs/enrollments.spec.ts` plus a
  fixture route, en/bn keys. No new dependency, migration or version bump.

---

## D-043 — T-042 Students module design (2026-11-17)

- **Context:** T-042 adds student admission, edit, soft delete/restore, status, photo, FTS5
  search, filters, a virtualized list and a six-tab profile shell. The `students` table exists
  from T-013 with indexes on name and phone but no photo column and no FTS table. PLAN.md §6
  explicitly schedules FTS5 over name, phone, guardian and student number for P2; TAD.md §7 gives
  the `counters` table to `payments`, so students cannot use it for its own number sequence.
  No human is present, so REPO_RULES.md §1.1 is followed and the stated lean is taken
  autonomously under AUTONOMY.md §2.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Student-number allocation (`YYYY-0001` by admission year).**
    - A1 — derive the next suffix from the largest existing `student_no` for that year inside one
      `db.tx`, with the table's UNIQUE constraint as the final guard. No cross-module read; the
      `Db` contract guarantees the queue is held for the whole transaction. Cost: relies on the
      serialized queue rather than a counter row.
    - A2 — allocate from the shared `counters` table. Cost: reads and writes a table owned by
      `payments` (TAD.md §7), which the module boundary forbids.
    - **Lean: A1.**
  - **B — Search.**
    - B1 — an FTS5 virtual table plus insert/update/delete triggers in one new append-only
      migration; `MATCH` with quoted prefix tokens. Cost: FTS5 must exist in the sqlite-wasm
      build; shadow tables need excluding from the migration schema test.
    - B2 — `LIKE '%term%'` over the indexed columns. Cost: no tokenised/prefix search, slower at
      5,000 rows, and does not implement PLAN.md §6's FTS5 instruction.
    - **Lean: B1.**
  - **C — Photo.**
    - C1 — a small optional `BLOB` column added in the same append-only migration; the form
      resizes and JPEG-compresses the image to a bounded size before storing. Cost: binary input
      handling in the form.
    - C2 — store a data URI in a text column. Cost: inflates the database and every backup; no
      size bound.
    - **Lean: C1.**
  - **D — Profile tabs.**
    - D1 — real Overview and History (the generic T-034 HistoryPanel); Enrollments, Payments,
      Attendance and Marks remain honest placeholders until their owning modules land. Cost:
      four tabs are placeholders for now.
    - D2 — read the other modules' tables from the profile. Cost: breaks TAD.md §2 ownership
      and must be reworked when those modules arrive.
    - **Lean: D1.**
  - **E — List rendering.**
    - E1 — TanStack Table + TanStack Virtual with a capped, FTS-backed result set. Cost: more UI
      code, but 5,000 rows stay responsive.
    - E2 — a plain table of every row. Cost: DOM blowup and a missed performance budget.
    - **Lean: E1.**
  - **F — Verification.**
    - F1 — a real `students.spec.ts` driving admission, search, edit, soft delete and restore.
      Cost: more selectors; proves the product surface.
    - F2 — a dev-only harness route. Cost: proves a test surface instead of the product.
    - **Lean: F1.**
- **Autonomous decision (T-042):** A1, B1, C1, D1, E1, F1 — take all six leans.
- **Why:** the number sequence stays inside the owning module, search is the FTS5 the plan asks
  for, the photo is bounded, the profile respects module ownership, and the list meets the
  performance budget. The new migration is **append-only** and follows the schema conventions;
  no Locked Decision, schema convention, backup/restore behaviour, test matrix or shared branch
  changes. Note: the 5,000-student seed command itself is T-044, so the performance line is
  verified with a one-off benchmark dataset, not a shipped `pnpm seed` script.
- **Impact:** new `src/modules/students/*` service/repository/UI files, one append-only migration
  registered in `src/core/db/migrations.ts`, a migration-test maintenance update for the new
  version and FTS shadow tables, `e2e/specs/students.spec.ts`, en/bn keys. No new dependency,
  version bump or change to `main`.
- **Follow-on found during implementation:** the trigger bodies required `splitSql` (T-013) to
  keep semicolons inside `CREATE TRIGGER ... BEGIN/END`. It now tracks only that block, with a
  regression test; every existing migration (no triggers) splits exactly as before. The new
  schema version also required updating the hard-coded backup-test schema constants.

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

## D-052 — T-061 Exam and marks grid (2026-11-17)

- **Context:** T-061 needs an exam per batch/subject/date, a marks grid with an absent flag, and a
  live batch average. The shipped exams migration has no UNIQUE constraint; `exam_results` is a
  junction with no version/deleted_at so generic versioned helpers do not apply. Grades/GPA are
  explicitly T-062 scope.
- **Decision (human, on the decision-advisor's recommendation):** A1 — enforce exam uniqueness in
  the service: SELECT then INSERT inside one `Db.tx`, throwing a domain error on duplicate; no
  schema change. B1 — the batch average uses entered marks of non-absent students only; unmarked
  present students and absent students are both excluded from numerator and denominator. C1 —
  reuse the T-060 roving-tabindex ARIA grid with a number input per cell and a separate absent
  toggle. D1 — a `/__marks-fixture` test route seeds the data and `marks.spec.ts` drives the real
  `/exams/:id` grid. E1 — grades/GPA are deferred to T-062 and noted as a known gap.
- **Why:** tx serialization makes the uniqueness check race-free without an append-only migration or
  a pre-migration snapshot; excluding absent entirely honours TAD §5.7 and FRONTEND_SPEC §5.6
  ("absent is a flag, not a zero"); reusing the T-060 grid pattern keeps behaviour and accessibility
  consistent; the E2E spec is an explicit ticket artifact; deferring grades keeps one ticket one change.
- **Impact:** new exams repository/service/types/screens/tests, a fixture route, an E2E spec, an
  academics `listSubjects` public read export, en/bn i18n keys. No new dependency, no schema change.

## D-051 — T-060 Attendance session and grid (2026-11-17)

- **Context:** T-060 needs an attendance session per batch+date, a one-action "mark all present",
  a keyboard-navigable grid and percentages from stored records. `attendance_sessions` has
  `UNIQUE(batch_id, held_on)`; `attendance_records` is a junction table with no version/deleted_at,
  so the generic versioned repository helpers do not apply.
- **Decision (human, on the decision-advisor's recommendation):** A1 — `getOrCreateSession`
  SELECTs then INSERTs inside `tx()`, reusing an existing session (idempotent on retry, race-free
  via the queue). B1 — "mark all present" upserts every enrolled student in one `Db.tx` with a
  single service-level audit entry (atomic, one round-trip). C1 — a roving-tabindex `role="grid"`
  where arrows move focus, Enter/Space toggles status and Tab exits the grid (satisfies the
  keyboard acceptance line and the ARIA grid pattern). D1 — a `/__attendance-fixture` test route
  seeds a batch with enrolled students and `attendance.spec.ts` drives the real grid.
- **Why:** idempotency and atomicity match the documented Db/tx guarantees; the roving grid is the
  only option that meets the arrow-key acceptance; an E2E spec is an explicit ticket artifact.
- **Impact:** new attendance repository/service/types/screens/tests, a fixture route and E2E spec,
  en/bn i18n keys. No new dependency. Absence counts as 0 and is excluded from averages per TAD §5.7.

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

## D-059 — T-073 admin report (2026-11-18)

- **Context:** T-073 implements PLAN.md P5-4: a monthly and per-academic-year admin report with eight
  sections (admissions by class/batch, drop-outs, collected, dues, method split, attendance rate, top
  performers, net), printed on A4 and exported to Excel. FRONTEND_SPEC §5.9 names the sections; T-072
  deliberately left this report to its own ticket (D-058 A1). Totals must equal the payments and
  students modules for the same range. No human is present, so REPO_RULES §1.1 is followed in full
  and the leans are taken autonomously under AUTONOMY.md §2.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Where the report lives.**
    - A1 — a dedicated \`/reports/admin\` screen in the reports module with section cards, reusing the
      existing A4 print CSS and lazy ExcelJS pattern. Cost: one new route, not a catalogue definition.
    - A2 — squeeze eight sections into a catalogue definition's rows. Cost: loses the section
      structure FRONTEND_SPEC §5.9 requires.
    - **Lean: A1.**
  - **B — Scope selectors.**
    - B1 — monthly (\`YYYY-MM\`) or per academic year (id from \`academic_years\`), each resolved to a
      from/to range. Cost: two selectors in one screen.
    - B2 — a free date range only. Cost: fails the "monthly and per academic year" acceptance line.
    - **Lean: B1.**
  - **C — Totals consistency.**
    - C1 — collected uses \`listRecordedPayments\`, dues uses \`duesReport\`, admissions and drop-outs
      use \`listStudents\`/\`listActive\`; method split groups the same valid payments. Cost: several
      public reads in one query module.
    - C2 — independent SQL per section. Cost: totals drift from the screens they must match.
    - **Lean: C1.**
  - **D — Verification.**
    - D1 — unit tests for all eight sections and totals equality against the module functions, plus
      \`admin-report.spec.ts\` asserting collected equals the payment register's total in the real
      screen. Cost: a fixture (reuse the dashboard fixture).
    - D2 — E2E only. Cost: totals equality needs a fast data-layer assertion.
    - **Lean: D1.**
- **Autonomous decision (T-073):** A1, B1, C1, D1 — take all four leans.
- **Why:** a dedicated screen keeps the eight sections legible; the two scopes are resolved to one
  range so every section uses the same window; the section totals come from the modules' own read
  functions so "totals equal the payments and students modules" is true by construction. No Locked
  Decision, schema convention, backup/restore behaviour, test matrix or shared branch change. Version
  impact is \`minor\` (a \`feat\`).
- **Impact:** new \`src/modules/reports/{queries/admin,admin-export,AdminReportScreen,admin.test}.ts(x)\`,
  an admin A4 print stylesheet, an admin i18n namespace, a \`/reports/admin\` route, \`admin-report.spec.ts\`,
  and D-059 / PROGRESS / CHANGELOG / session-log updates. No new dependency, migration or write path.

## D-058 — T-072 report catalogue (2026-11-17)

- **Context:** T-072 implements the report catalogue on the T-071 framework: student list,
  admissions, payment register, dues, receipts by date range, attendance and result sheets. Its scope
  line also names the admin report, but T-073 is a dedicated ticket for that report with its own
  acceptance lines. Report totals must equal the sums shown in the payments and students modules for
  the same range. No human is present, so REPO_RULES §1.1 is followed in full and the leans are taken
  autonomously under AUTONOMY.md §2.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — The admin-report overlap.**
    - A1 — T-072 supplies the seven catalogue reports; T-073 owns the admin report. Cost: T-072's
      scope line literally mentions the admin report, but a dedicated ticket with an explicit
      acceptance set is the stronger one-behavior-per-ticket rule.
    - A2 — implement the admin report here and leave T-073 with nothing to do. Cost: breaks T-073's
      acceptance line and bundles two changes.
    - **Lean: A1.**
  - **B — Totals consistency.**
    - B1 — loaders for payment/dues/admissions reports call the same public module reads the screens
      use (`listRecordedPayments`, `duesReport`, `listStudents`), with a unit test asserting the report
      total equals the module total. Cost: loaders live in the read-model `queries/` folder but import
      module public APIs, which TAD §2 rule 3 permits alongside direct reads.
    - B2 — independent SQL per report. Cost: totals drift from the modules they are meant to match.
    - **Lean: B1.**
  - **C — Framework changes.**
    - C1 — add report definitions plus an optional total accessor to the existing registry; the
      from/to/batch/class filter bar already covers the catalogue. Cost: one additive field and one
      total line in the framework, no new filter kinds.
    - C2 — add a new filter kind per report. Cost: a larger framework change with no acceptance behind it.
    - **Lean: C1.**
  - **D — Verification.**
    - D1 — unit tests for each report's rows and totals against a seeded DB and the module functions,
      plus `reports.spec.ts` switching reports and asserting totals in the real screen. Cost: several
      small tests.
    - D2 — E2E only. Cost: totals equality needs a fast data-layer assertion.
    - **Lean: D1.**
- **Autonomous decision (T-072):** A1, B1, C1, D1 — take all four leans.
- **Why:** the dedicated admin-report ticket keeps one change per ticket; using the modules' own read
  functions makes "report totals equal module sums" true by construction; the framework needs no
  change to host more definitions. No Locked Decision, schema convention, backup/restore behaviour,
  test matrix or shared branch change. Version impact is `minor` (a `feat`).
- **Impact:** additive report definitions and loaders in `src/modules/reports/{queries,registry}.ts`,
  i18n keys for each report and its columns, unit tests and an extended `reports.spec.ts`, and
  D-058 / PROGRESS / CHANGELOG / session-log updates. No new dependency, migration or write path.

## D-057 — T-071 reports framework (2026-11-17)

- **Context:** T-071 builds the reports framework on `/reports`: a filter bar, a preview, a print
  view, and Excel and CSV exports that use the filters currently shown. `reports` is a read-model
  module whose screen is a placeholder; PLAN §3 locks ExcelJS for Excel and self-hosted Bengali
  fonts; T-054's receipt export already establishes lazy ExcelJS + UTF-8 strings. The full catalogue
  is T-072 (admin report is T-073). No human is present, so REPO_RULES §1.1 is followed in full and
  the leans are taken autonomously under AUTONOMY.md §2.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Framework shape.**
    - A1 — a registry of report definitions (`id`, `titleKey`, `columns`, `load(db, filter)`), with
      one worked report (student list) in T-071; T-072 adds the rest by supplying definitions.
      Cost: the catalogue is incomplete until T-072, which is that ticket's job.
    - A2 — build every report now. Cost: absorbs T-072 and breaks one-ticket-one-change.
    - **Lean: A1.**
  - **B — Where report data is read.**
    - B1 — parameterized read-model SQL in `reports/queries/` (TAD §2 rule 3), one loader per
      definition. Cost: reports names read-only tables, which the read-model exception allows.
    - B2 — call each owning module's service. Cost: a framework needs one generic loader shape and
      several modules have no report-shaped public read.
    - **Lean: B1** — T-072 asserts each total against the owning module for cross-checking.
  - **C — Exports.**
    - C1 — feed the exact same filtered `rows` to the preview and both exports; CSV as UTF-8 with a
      BOM (Excel/Bangla), Excel via lazily imported ExcelJS (PLAN §3 lock). Cost: two small functions.
    - C2 — CSV without a BOM. Cost: Bangla opens garbled in Excel, failing the acceptance line.
    - **Lean: C1.**
  - **D — Verification.**
    - D1 — unit tests for CSV BOM/content and workbook rows; `reports.spec.ts` filters a report and
      asserts the downloaded CSV is exactly the preview rows, plus the A4 print view. Cost: a
      fixture (reuse the dashboard fixture's seeded students).
    - D2 — E2E only. Cost: "export equals preview" needs a fast content-level assertion.
    - **Lean: D1.**
- **Autonomous decision (T-071):** A1, B1, C1, D1 — take all four leans.
- **Why:** one registry and one row set make preview and exports agree by construction; the BOM and
  lazy ExcelJS meet the locked Excel/Bangla requirements; reporting stays a read model inside TAD
  §2 rule 3. No Locked Decision, schema convention, backup/restore behaviour, test matrix or shared
  branch change. Version impact is `minor` (a `feat`).
- **Impact:** new `src/modules/reports/{queries/students,registry,export,types,Screen,reports.test}.ts(x)`
  and A4 `reports.css`, a reports i18n namespace, `reports.spec.ts`, and D-057 / PROGRESS / CHANGELOG
  / session-log updates. No new dependency (ExcelJS already installed), migration or write path.

## D-056 — T-070 dashboard (2026-11-17)

- **Context:** T-070 builds the dashboard: collection vs due, admissions, active students, today's
  batches, low-attendance students, recent toppers and the backup health warning. Each KPI must be
  a link to the filtered list behind it and its number must match the owning module for the same
  range. `dashboard` is a read-model module whose screen is a placeholder; T-053's dues report and
  T-063's leaderboard are now merged. No human is present, so REPO_RULES §1.1 is followed in full
  and the leans are taken autonomously under AUTONOMY.md §2.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Where KPI numbers come from.**
    - A1 — call the owning modules' public reads (`listRecordedPayments`, `duesReport`,
      `listStudents`, `listActive`) for the numbers that must match, and use dashboard's own
      `queries/` folder only for the cross-module read-model bits (today's batches, low attendance,
      recent toppers) per TAD §2 rule 3. Cost: several reads in one service call.
    - A2 — reimplement every KPI in dashboard SQL. Cost: duplicates the payments dues rule and risks
      drifting from the module the KPI is supposed to match.
    - **Lean: A1.**
  - **B — Range.**
    - B1 — all-time collection and outstanding dues (both from the payments module over the same
      live dataset), admissions counted from `listStudents` for the current Dhaka month, active
      students from `listActive`. Cost: no range picker, but the "same range" requirement is met
      because each KPI uses exactly the owning module's dataset.
    - B2 — a range picker over every KPI. Cost: the dues report has no range parameter; adding one
      reworks T-053 and is not in this ticket.
    - **Lean: B1.**
  - **C — Low attendance.**
    - C1 — students below 75% of marked sessions, computed in the dashboard queries folder from
      `attendance_records` (present / marked), linked to the attendance screen. Cost: one threshold
      constant.
    - C2 — below the pass mark. Cost: mixes a marks scale into an attendance measure.
    - **Lean: C1.**
  - **D — Verification.**
    - D1 — unit tests against `better-sqlite3` asserting each KPI equals the owning module's public
      function over the same seeded data, plus `dashboard.spec.ts` asserting the rendered KPIs and
      links against a fixture. Cost: one test-only fixture route.
    - D2 — E2E only. Cost: "matches the payments module" needs a fast data-layer assertion.
    - **Lean: D1.**
- **Autonomous decision (T-070):** A1, B1, C1, D1 — take all four leans.
- **Why:** the numbers come from the same public functions the modules expose, so the KPI-match
  acceptance is true by construction; the read-model query folder stays inside TAD §2 rule 3; the
  backup warning reuses the existing health helper rather than reimplementing staleness. No Locked
  Decision, schema convention, backup/restore behaviour, test matrix or shared branch change.
  Version impact is `minor` (a `feat`).
- **Impact:** new `src/modules/dashboard/{queries/dashboard,service,types,Screen,dashboard.test}.ts(x)`
  and a dashboard i18n namespace, a `/__dashboard-fixture` route and router registration,
  `dashboard.spec.ts`, and D-056 / PROGRESS / CHANGELOG / session-log updates. No new dependency,
  migration or write path.

## D-055 — T-063 ranking and leaderboard (2026-11-17)

- **Context:** T-063 needs ranks per exam, per month and per academic year, filtered by batch or
  class, printable, with competition ranking (1, 2, 2, 4) and absent counted as zero in totals but
  excluded from averages (TAD §5.7, FRONTEND_SPEC §5.7). `leaderboard` is a read-model module whose
  screen is still a placeholder; `exam_results` is an owned junction with no version/deleted_at.
  No human is present, so REPO_RULES §1.1 is followed in full and the leans are taken autonomously
  under AUTONOMY.md §2.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Where the SQL lives.**
    - A1 — in `src/modules/leaderboard/queries/`, the read-model exception in TAD §2 rule 3 (read any
      table from files in that folder, never write). Cost: leaderboard names other modules' tables,
      but that is the documented exception and keeps the rule in the owning ticket's module.
    - A2 — add ranking services to exams/students/enrollments and orchestrate their public APIs.
      Cost: ranking rules leak into three owning modules and the ticket spans four modules.
    - **Lean: A1.**
  - **B — Rank computation.**
    - B1 — SQL `RANK() OVER (ORDER BY total DESC)` — competition ranking, ties share and the next
      rank skips. Cost: none; sqlite-wasm and better-sqlite3 both support window functions.
    - B2 — compute ranks in JavaScript after fetching totals. Cost: duplicates SQL ordering and is
      slower at scale.
    - **Lean: B1.**
  - **C — Absent and unmarked.**
    - C1 — contribute 0 to totals; exclude from the average (TAD §5.7, absent is a flag not a zero).
      Cost: none.
    - C2 — count absent as full marks. Cost: contradicts the locked absent rule.
    - **Lean: C1.**
  - **D — Scope and filter semantics.**
    - D1 — one parameterized query with a scope discriminator: exam (`exam_id`), month
      (`substr(held_on,1,7)`), academic year (the exam's batch's `academic_year_id`); batch/class
      filters constrain the exams considered. Cost: three branches in one query builder.
    - D2 — per exam only. Cost: fails the "each scope filter returns the right set" acceptance.
    - **Lean: D1.**
  - **E — Verification.**
    - E1 — unit tests against `better-sqlite3` asserting 1,2,2,4, absent-as-zero, and each scope and
      filter; `leaderboard.spec.ts` with a small fixture seeding a tie and asserting the real screen.
      Cost: one test-only fixture route.
    - E2 — E2E only. Cost: ranking edge cases need fast unit coverage.
    - **Lean: E1.**
- **Autonomous decision (T-063):** A1, B1, C1, D1, E1 — take all five leans.
- **Why:** the read-model query folder is the architecture's own exception for cross-table reads;
  SQL window ranking gives the exact competition ranks the ticket names; absent handling reuses the
  rule already locked for exams; one parameterized query serves all three scopes without duplicating
  logic. No Locked Decision, schema convention, backup/restore behaviour, test matrix or shared
  branch change. Version impact is `minor` (a `feat`).
- **Impact:** new `src/modules/leaderboard/{queries/rankings,service,types,Screen,rankings.test}.ts(x)`,
  a print stylesheet, a `/__leaderboard-fixture` test route and router registration,
  `leaderboard.spec.ts`, en/bn leaderboard keys, and D-055 / PROGRESS / CHANGELOG / session-log
  updates. No new dependency, migration or write path.

## D-054 — T-062 grades and GPA (2026-11-17)

- **Context:** T-062 implements grades and GPA from the settings scale. Acceptance: 80 is A+, 79 is
  A, below 33 is F worth 0, and changing the scale in Settings changes the grade. PLAN §8/P4-3 and
  FRONTEND_SPEC §5.6 require grade and GPA to be shown beside each student in the marks grid, and
  T-061's known gap assigned those columns to T-062 — yet T-062's own line reads "E2E: n/a — no
  UI/user-visible behaviour". TICKETS.md says the plan wins when the two disagree about **what** to
  build. No human is present, so REPO_RULES §1.1 is followed in full and the leans are taken
  autonomously under AUTONOMY.md §2.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Scope of the display.**
    - A1 — pure/service logic only, no UI. Cost: FRONTEND_SPEC §5.6 and the T-061 known gap stay
      unmet, so the feature is unreachable to the admin.
    - A2 — pure grade/GPA logic plus grade and points columns beside each student in the marks grid.
      Cost: adds UI to a ticket scoped `senior-backend` and contradicts the "E2E: n/a" rationale.
    - **Lean: A2** — PLAN §8 and FRONTEND_SPEC §5.6 own "what to build" and both require the display;
      TICKETS.md makes the plan win on scope. "E2E: n/a" is honoured by extending the existing
      `marks.spec.ts` rather than creating a new spec.
  - **B — Band matching.**
    - B1 — inclusive `min <= score <= max`: 80 → A+ (80–100), 79 → A (70–79), <33 → F (0–32).
      Cost: a human-edited scale with gaps yields no grade for uncovered scores.
    - B2 — snap to the nearest band. Cost: silently misgrades when bounds are edited.
    - **Lean: B1** — exact band semantics, no gap in the documented default.
  - **C — "GPA" in a single-exam grid.**
    - C1 — show the grade letter and the band's grade points (0–5) for that exam, and expose a pure
      `gpaFor(scores, scale)` for cumulative means (reusable by T-063's leaderboard). Cost: two
      small pure functions.
    - C2 — compute a cumulative per-student GPA across all exams inside the grid. Cost: cross-exam
      aggregation in a single-exam screen with more queries, not required by the acceptance lines.
    - **Lean: C1.**
  - **D — Where the scale is read.**
    - D1 — a `useQuery` on `getSetting(db, 'gradingScale')` in the grid and pure `gradeFor` per cell
      from the current (optimistic) marks, so the letter/points update live and reflect any Settings
      edit. Cost: one small query; the component calls the pure helper.
    - D2 — a service returning a precomputed grade map refetched only after each save. Cost: grades
      lag in-progress edits and duplicate the grid's optimistic model.
    - **Lean: D1.**
  - **E — Verification.**
    - E1 — pure unit tests for all three acceptance lines plus a test that a scale persisted through
      `setSetting` and read through `getSetting` changes the grade; extend the existing
      `marks.spec.ts` with grade/points cell assertions. Cost: a small scale change in a unit test.
    - E2 — unit tests only. Cost: would not prove the columns render in the real grid.
    - **Lean: E1.**
- **Autonomous decision (T-062):** A2, B1, C1, D1, E1 — take all five leans.
- **Why:** grade conversion stays a pure, testable function of the score and the live Settings
  scale; the default band boundaries in TAD §5.7 are unchanged; the grid shows the admin the grade
  and points beside each student as the plan and frontend spec require. No Locked Decision, schema
  convention, backup/restore behaviour, test matrix or shared branch change. Version impact is
  `minor` (a `feat`).
- **Impact:** new `src/modules/exams/{grades,grades.test}.ts`, grade/points columns + a settings
  query in `MarksGrid.tsx`, a `GradingScale` type re-export from the settings public index, en/bn
  `exams.grade`/`exams.points` keys, extended `marks.spec.ts`, and D-054 / PROGRESS / CHANGELOG /
  session-log updates. No new dependency or migration.

## D-053 — BUG-011 missing-exam detail handling (2026-11-17)

- **Context:** `/exams/:id` for a missing/soft-deleted exam makes `getExam` resolve to `undefined`;
  TanStack Query logs "Query data cannot be undefined" and the marks grid has no honest not-found
  state (BUG-011). The bug was logged first. No human is present, so REPO_RULES.md §1.1 is followed
  in full — two viable options per open choice with concrete trade-offs and a stated lean — and the
  stated lean is then taken autonomously under AUTONOMY.md §2. `StudentProfile` already shows the
  screen-level `if (!row) throw` pattern; no service-level typed not-found error exists yet.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Where the "never undefined" rule lives.**
    - A1 — in `MarksGrid`'s query function only, mirroring `StudentProfile`: `if (!exam) throw`.
      Cost: the guard sits at the UI boundary and any future `getExam` caller (T-062/T-063) can
      repeat the same mistake.
    - A2 — in the exams service: an exported loader calls the low-level `getExam` and throws a typed
      error when it returns `undefined`; the screen's query function calls the loader; the repository
      keeps its honest `rows[0]`/`undefined` return. Cost: one small exported function.
    - **Lean: A2** — the invariant belongs in the owning module and is reusable and unit-testable.
  - **B — Error type.**
    - B1 — a module `ExamNotFoundError` (a typed error set, REPO_RULES §7.7 #23), carrying the id.
      Cost: one small class.
    - B2 — a bare `new Error('not found')` like `StudentProfile`. Cost: hard-coded English string and
      nothing to discriminate against.
    - **Lean: B1.**
  - **C — Screen behaviour on a missing exam.**
    - C1 — render pending / not-found / retry states (REPO_RULES §7.6 #18) from new `exams.notFound`
      and `exams.retry` i18n keys, with `retry: false` on the detail query (a fixed missing id will
      not appear on retry). All hooks stay above the early returns. Cost: a few lines of JSX.
    - C2 — redirect to `/exams` with a toast. Cost: hides the error, offers no retry and loses the
      explicit "not found" clarity.
    - **Lean: C1.**
  - **D — Regression test.**
    - D1 — a component test rendering the real `MarksGrid` at `/exams/missing` with `getDb` mocked,
      asserting the not-found alert renders and `console.error` was **not** called with the
      "Query data cannot be undefined" message; plus a service unit test that the loader rejects
      with `ExamNotFoundError`. Cost: a QueryClientProvider + memory-router test harness.
    - D2 — service test only. Cost: would not exercise the query-function wiring that caused the
      console error, so it would not fail on the pre-fix behaviour.
    - **Lean: D1.**
- **Autonomous decision (BUG-011):** A2, B1, C1, D1 — take all four leans.
- **Why:** the invariant is owned and tested at the service boundary, expressed as a typed domain
  error rather than a bare string, and surfaced in the UI as honest async states; the regression
  test reproduces the exact pre-fix symptom (console error + missing not-found UI) and fails before
  the fix. No Locked Decision, schema convention, backup/restore behaviour, test matrix or shared
  branch changes. Version impact is `patch` (a `fix`).
- **Impact:** additive `ExamNotFoundError` + loader in `src/modules/exams/service.ts`, the
  `MarksGrid` query function and async-state rendering, en/bn `exams.notFound`/`exams.retry` keys,
  a component regression test plus a service unit test, and D-053 / BUGS / PROGRESS / CHANGELOG /
  session-log updates. No new dependency, migration or schema change.

## D-060 — T-080 PIN lock and roles (2026-11-18)

- **Context:** T-080 adds a PBKDF2 admin PIN, an inactivity lock and the three roles enforced in
  services. PLAN §3/§7.7 locks PBKDF2-SHA-256 at 600,000 iterations with a 16-byte per-user salt,
  a 10-minute default idle timeout, and service-side (not only UI) permission checks. SECURITY
  §3/§4 fixes the permission matrix and forbids the PIN in logs, backups or audit payloads. There is
  no auth code yet: `makeAuditContext()` carries a null actor with a P6-1 note. The 11 screens and
  their 25 E2E specs start unlocked, so a forced first-run PIN gate would break the whole suite.
  No human is present, so REPO_RULES §1.1 is followed in full and the leans are taken autonomously
  under AUTONOMY.md §2.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Where the PIN hash lives.**
    - A1 — a dedicated `users` table via an append-only migration (three seeded role accounts).
      Cost: a schema-version change, three hard-coded default PINs (credentials) and migration-test
      churn; the hash would travel in every backup.
    - A2 — the existing `settings` key/value table. Cost: audited writes would put the hash in
      `audit_log` before/after JSON, which SECURITY §3.3 forbids in spirit, and the storage would
      travel in backups.
    - A3 — the WebCrypto PBKDF2 record (salt, hash, iterations) in `localStorage`, never in the
      database. Cost: the PIN is per-device, which matches the offline single-device, single-tab
      product; no migration and no audit/backup exposure.
    - **Lean: A3.**
  - **B — Default lock state.**
    - B1 — force a PIN on first run. Cost: every existing E2E spec would hit a setup screen and fail
      until each was rewritten; PLAN §7.7 says the PIN is "enabled in P6", not forced at install.
    - B2 — opt-in: with no PIN stored the app works unlocked as Admin; setting a PIN activates the
      lock screen and idle enforcement. Cost: out of the box the lock is dormant until configured.
    - **Lean: B2** — preserves the green suite and makes the feature reachable from Settings.
  - **C — Session and roles.** C1 — a `Session` (actor id + role) in `sessionStorage`, with
    `currentSession()` returning Admin when no PIN is configured; services receive the session as
    their authority object and call `assertPermission`. C2 — a module-level mutable "current role"
    global. Cost: shared state that leaks between tests and tabs. **Lean: C1** — testable, explicit
    and matches D-024's explicit-context rule. A service never accepts a raw role or permission
    string from the caller (SECURITY §4.2); it accepts the authenticated `Session`.
  - **D — Permission guard placement.** D1 — add an additive `recordPaymentAs(session, db, input)`
    that checks `payments.write` then delegates to the existing `recordPayment`. Cost: the old
    function remains callable. D2 — change `recordPayment`'s signature. Cost: HIGH blast radius
    (5 upstream callers across 2 modules plus 20 test call sites). **Lean: D1** — the UI calls the
    guarded entry point, the service-level test targets it, and no high-risk signature changes.
  - **E — Verification.** E1 — unit tests for the permission matrix, PBKDF2 hash/verify, PIN store,
    idle lock and the Teacher write refusal, plus `auth.spec.ts` driving the real lock/unlock and
    UI denial through a `/__auth-fixture` test route. E2 — E2E only. Cost: crypto and permission
    edge cases need fast unit coverage. **Lean: E1.**
- **Autonomous decision (T-080):** A3, B2, C1, D1, E1 — take all five leans.
- **Why:** the PIN never touches the database, audit log or backups; the default remains the
  unlocked single-admin experience so the shipped suite stays green; roles live in a testable
  session that services trust; and the one guarded write path is additive to a high-blast-radius
  function. No Locked Decision, schema convention, backup/restore behaviour, test matrix or shared
  branch changes. Version impact is `minor` (a `feat`).
- **Impact:** new `src/core/auth/{roles,errors,pin,pin-store,session,authorize,index}.ts` and tests,
  `src/app/auth/{useAuth,AuthGate,PinSetupScreen,PinLockScreen,SecurityPanel}.tsx`, a `/__auth-fixture`
  route, an additive guarded payment service function, an en/bn auth namespace, `auth.spec.ts`, and
  D-060 / PROGRESS / CHANGELOG / session-log updates. No dependency, migration or `main` change.

---

## D-061 — T-081 Import tools with a dry run (2026-11-18)

- **Context:** T-081 adds CSV/Excel import for students, batches, enrollments and marks with a
  template, column mapping, a row-level validation preview, a dry run, idempotency and a forced
  pre-import snapshot before one committing transaction. PLAN §7.6 owns the flow; §3 locks ExcelJS
  for Excel. `exceljs` is already installed (lazy, for exports); there is no CSV reader, no import
  UI, and `createSnapshot({ reason: 'pre-import', force: true })` already supports the safety copy.
  No human is present, so REPO_RULES §1.1 is followed and the leans are taken autonomously.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Parsing.** A1 — a small pure CSV reader (quoted fields, escaped quotes, CRLF) plus lazy
    ExcelJS `xlsx.load` for workbooks; both produce one `{headers, rows}` shape. Cost: ~60 lines of
    CSV logic we own. A2 — add a CSV library. Cost: a new dependency and lockfile churn for a
    well-understood format. **Lean: A1.**
  - **B — Column mapping.** B1 — headers map to template fields by name with a user-editable select
    per field; the mapping is a `Record<field, columnIndex>` passed to the pure validator. Cost: a
    few selects in the UI. B2 — fixed column order only. Cost: fails the "column mapping" scope line.
    **Lean: B1.**
  - **C — Validation and idempotency.** C1 — one pure per-kind validator returns row-level errors
    plus a normalized value object; keys are `student_no` for students and natural keys for the
    other kinds, checked against existing rows and de-duplicated inside the file before any write.
    Cost: four small validators. C2 — validate inside the transaction. Cost: errors found after the
    snapshot and mid-write, so the "preview before anything is written" line is weaker.
    **Lean: C1.**
  - **D — Commit.** D1 — `createSnapshot({ reason: 'pre-import', force: true })`, then one `db.tx`
    over audited repo helpers; a failed row aborts the whole import and the snapshot stays as the
    recovery point. Cost: none. D2 — write row by row outside a transaction. Cost: a partial import
    on failure. **Lean: D1.**
  - **E — Verification.** E1 — unit tests for CSV parsing, mapping, row errors, idempotency and the
    dry-run/no-write guarantee, plus `import.spec.ts` driving the real screen with a file that has
    one bad row. E2 — E2E only. Cost: parsing and idempotency need fast unit coverage. **Lean: E1.**
- **Autonomous decision (T-081):** A1, B1, C1, D1, E1 — take all five leans.
- **Why:** one file shape feeds both parsers and the preview, mapping is explicit and testable, all
  errors are visible before the safety snapshot, and the commit is atomic with a forced recovery
  point. No Locked Decision, schema convention, backup/restore behaviour, test matrix or shared
  branch change. Version impact is `minor` (a `feat`).
- **Impact:** new `src/modules/data-tools/import/{csv,excel,template,validate,service}.*`, an
  `/data-tools/import` screen and route, en/bn import keys, unit tests, `import.spec.ts`, and
  D-061 / PROGRESS / CHANGELOG / session-log updates. No new dependency, migration or `main` change.

---

## D-062 — T-082 Audit log viewer (2026-11-18)

- **Context:** T-082 adds a filterable table of every `audit_log` change with entity/action/date
  filters and viewable before/after snapshots. `listHistory(db, table, id)` already parses snapshots
  but is scoped to one record. FRONTEND_SPEC §5.10 puts the viewer in Data tools; the commit scope is
  `audit`. `audit_log` has `entity`, `action`, `at` (epoch ms) and JSON snapshots; there is no audit
  UI. No human is present, so REPO_RULES §1.1 is followed and the leans are taken autonomously.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Read model.** A1 — an additive `listAudit(db, filter)` in `src/core/audit/query.ts`, with
    entity/action/date predicates bound in one parameterized query and parsed before/after rows.
    Cost: one small read module. A2 — reuse `listHistory` per table. Cost: it needs a record id and
    cannot answer "every change". **Lean: A1.**
  - **B — Entity options.** B1 — derive the entity filter's options from `SELECT DISTINCT entity`
    so new modules appear without editing UI. Cost: one small query. B2 — hard-code the table
    allowlist. Cost: drifts as modules land. **Lean: B1.**
  - **C — Detail display.** C1 — an expandable `<details>` row with pretty-printed before/after
    JSON. Cost: long snapshots make the table tall; the block scrolls within a max height. C2 — a
    dialog per row. Cost: more state and a new component for the same information. **Lean: C1.**
  - **D — Volume.** D1 — return all matching rows and render them inside a scrollable, horizontally
    contained table; filters narrow the set. Cost: the DOM grows with the log. D2 — paginate.
    Cost: a page control and a count query with no acceptance behind it. **Lean: D1.**
  - **E — Verification.** E1 — unit tests for filters and parsed snapshots plus `audit-viewer.spec.ts`
    driving a real change from `/__undo` and asserting it appears with its before/after. E2 — E2E
    only. Cost: filter correctness needs a fast data-layer assertion. **Lean: E1.**
- **Autonomous decision (T-082):** A1, B1, C1, D1, E1 — take all five leans.
- **Why:** one query owns the read model, filter options stay current by construction, and the
  detail view is the smallest surface that shows both snapshots. No Locked Decision, schema
  convention, backup/restore behaviour, test matrix or shared branch change. Version impact `minor`.
- **Impact:** new `src/core/audit/query.ts` + test, `src/modules/data-tools/AuditViewerScreen.tsx`
  and `/data-tools/audit` route, en/bn audit-viewer keys, `audit-viewer.spec.ts`, and D-062 /
  PROGRESS / CHANGELOG / session-log updates. No new dependency, migration or `main` change.

---

## D-063 — T-083 Performance pass (2026-11-18)

- **Context:** T-083 must prove the PLAN §10 budgets at 5,000 students, 60,000 payments and
  200,000 marks: list/search under 100 ms, every report under 2 s, initial JS under 300 KB. The
  bundle budget is already gated by `pnpm budget`. `pnpm seed` generates students only; there is no
  benchmark for payments or marks. No human is present, so REPO_RULES §1.1 is followed and the
  leans are taken autonomously.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Harness.** A1 — a standalone `pnpm perf` command that builds a better-sqlite3 DB,
    migrates it, bulk-loads deterministic data inside one transaction and times the _real_ module
    read functions. It is a dedicated file run by Vitest only for `@/` alias resolution, and is
    deliberately **not** part of `pnpm check`. Cost: schema-aware seed SQL we own. A2 — a Vitest
    performance suite inside `pnpm check`. Cost: timing assertions on CI are slow and flaky.
    **Lean: A1.**
  - **B — Data generation.** B1 — pure deterministic generators in `scripts/seed-data.ts` for the
    payment and mark rows, alongside `generateStudents`. Cost: more pure code. B2 — random data
    generated inline in the benchmark. Cost: results vary run to run and cannot be compared.
    **Lean: B1.**
  - **C — Fixes.** C1 — measure first, then add only the indexes/queries the numbers justify, as an
    append-only migration. Cost: one more migration to test. C2 — rewrite every report query up
    front. Cost: broad risk with no evidence of which query is slow. **Lean: C1.**
  - **D — Gate.** D1 — a `pnpm perf` command that exits non-zero when a budget is missed, with the
    numbers documented in DEVELOPMENT.md and PROGRESS.md. Cost: a new script entry. D2 — a
    report-only script nobody gates on. Cost: regressions would not be caught. **Lean: D1.**
- **Autonomous decision (T-083):** A1, B1, C1, D1 — take all four leans.
- **Why:** a deterministic, standalone script measures the shipped code paths without slowing or
  destabilising CI, and fixes follow measured evidence rather than speculation. No Locked Decision,
  schema convention, backup/restore behaviour, test matrix or shared branch change; any index is
  additive and append-only. Version impact `patch` (recorded, not applied — releases are human-only).
- **Impact:** new deterministic generators, `scripts/perf-budget.ts`, a `pnpm perf` script, possibly
  one additive index migration if a measurement misses, plus D-063 / PROGRESS / CHANGELOG /
  session-log updates. No dependency, `main`, release or tag change.

---

## D-064 — T-084 Accessibility and Bangla review (2026-11-18)

- **Context:** T-084 requires a keyboard-only walkthrough, bound labels, AA contrast in both themes,
  no horizontal scroll at 360px, and a human review of the Bangla strings, plus `a11y.spec.ts`.
  Most product forms already use `<Label htmlFor>`; a cluster of report/leaderboard screens use
  implicit `<label><span>…</span><control/></label>` wrappers. There is no axe dependency and no
  dark-mode toggle in v1. No human is present, so REPO_RULES §1.1 is followed and the leans taken.
- **Options surfaced, with trade-offs and the lean for each:**
  - **A — Label binding.** A1 — a one-off codemod adds `htmlFor`/`id` to the implicit wrappers,
    then a spec asserts every visible control has an associated label. Cost: a mechanical diff over
    three screens. A2 — hand-edit each control. Cost: slow and easy to miss one. **Lean: A1.**
  - **B — Verification.** B1 — `e2e/specs/a11y.spec.ts` checks tab order, the visible focus ring,
    label association and 360px overflow using the shipped CSS. Cost: no new dependency. B2 — add
    `@axe-core/playwright`. Cost: E2E_TESTING.md §9 makes that a human-confirmed dependency.
    **Lean: B1.**
  - **C — Contrast.** C1 — compute WCAG ratios in-page from computed styles for representative
    text/background pairs, toggling `.dark` for the second theme. Cost: a small test helper. C2 —
    visual inspection only. Cost: no reproducible evidence. **Lean: C1.**
  - **D — Bangla.** D1 — fix the two leaked English tokens and the wrong status vocabulary from
    BUG-013 here, and record that the **human** review line remains outstanding. Cost: a bug is
    closed while the human line stays open. D2 — defer all Bangla work. Cost: known bad strings
    ship. **Lean: D1.**
- **Autonomous decision (T-084):** A1, B1, C1, D1 — take all four leans.
- **Why:** the checks are reproducible and dependency-free, and the obvious string defects are
  fixed. The "a human has reviewed the Bangla strings" line cannot be satisfied by an autonomous
  run; it is recorded as an open requirement, not claimed as met. No Locked Decision, schema
  convention, backup/restore behaviour, test matrix or shared branch change. Version impact `patch`.
- **Impact:** label attributes on three screens, the new `a11y.spec.ts`, a 360px viewport case,
  the BUG-013 string/vocabulary fix, and D-064 / PROGRESS / CHANGELOG / session-log updates. No
  new dependency or migration.

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
