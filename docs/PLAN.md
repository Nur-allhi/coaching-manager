# Coaching Manager: Build Plan for the AI Agent

Local-first single-page app. React + TypeScript + SQLite (WASM). Plan v1.0, 16 Nov 2026.

## 1. Rules for the agent

- This document is the source of truth. Read sections 1 to 6 fully before writing code. Before each task, read its phase (section 9) and the relevant module spec (section 8).
- Work on one task ID at a time, in order. Do not start a phase until the previous phase's exit criteria pass.
- A task is done only when: `pnpm typecheck` and `pnpm lint` pass, tests for it exist and pass, the acceptance line is demonstrated, and `docs/PROGRESS.md` is updated (task ID, what changed, known gaps).
- Never change a Locked Decision (section 3) without asking the human. For Open Decisions (section 4) use the default and record it in `docs/DECISIONS.md`.
- No network calls at runtime: no analytics, CDN, remote fonts, or cloud APIs. The app must work fully offline.
- Money is never a float. Business records are never hard-deleted. UI code never runs SQL directly; it goes through module services.
- If a rule is ambiguous or two rules conflict, stop and ask. Never guess on money, backup, restore, or migration behavior.
- One task per commit, message format: `feat(payments): P3-2 record payment`.

## 2. Product scope

Primary user: the coaching center admin. Optional later: teachers and an accountant. One device, one active browser tab, all data stays on the device.

v1 capabilities:

- Academic years, classes, batches (days, time slot, room, capacity, fee).
- Student admission and full profile; enrollment into one or more batches.
- Monthly fee charges, payments (partial, advance, discount), dues list, payment receipts.
- Attendance per batch session.
- Exams, class test marks, grades, ranking, leaderboard.
- Dashboard, reports, and exports (PDF, Excel, CSV), including the admin report.
- Every record is editable, with a full audit trail and undo.
- Automatic snapshots (last 10 kept), restore, and file export and import of the whole database.

Out of scope for v1: cloud sync, multi-device, online payments, SMS gateway, student or parent portal.

## 3. Locked decisions (stack)

| Area        | Choice                                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build       | Vite, React 19, TypeScript (strict), pnpm                                                                                                           |
| Database    | SQLite via `@sqlite.org/sqlite-wasm`, OPFS with the `opfs-sahpool` VFS, running inside a dedicated Web Worker. This VFS needs no COOP/COEP headers. |
| DB access   | Small typed `Db` client over the worker (Comlink), hand-written parameterized SQL in per-module repositories, Zod validation at every boundary      |
| Async state | TanStack Query (reads, optimistic mutations, rollback)                                                                                              |
| UI state    | Zustand, only for tiny UI state (filters, dialogs)                                                                                                  |
| Routing     | React Router (library mode), lazy-loaded route per module                                                                                           |
| Forms       | React Hook Form + Zod                                                                                                                               |
| UI kit      | Tailwind CSS v4 + shadcn/ui (Radix), TanStack Table + TanStack Virtual for big lists                                                                |
| Charts      | Recharts                                                                                                                                            |
| i18n        | i18next, English and Bangla, self-hosted Noto Sans Bengali font                                                                                     |
| IDs         | UUIDv7 (`uuidv7` package), time-sortable, sync-ready                                                                                                |
| Dates       | `date-fns`. Dates stored as `YYYY-MM-DD`, months as `YYYY-MM`, timestamps as epoch milliseconds (UTC). Display timezone Asia/Dhaka.                 |
| Exports     | PDF: HTML print routes with `@page` CSS (browser shapes Bangla correctly). Excel: ExcelJS. CSV: PapaParse.                                          |
| PWA         | `vite-plugin-pwa` (Workbox), `navigator.storage.persist()`                                                                                          |
| Crypto      | WebCrypto only (SHA-256 checksums, PBKDF2 PIN hashing, AES-GCM for encrypted backups)                                                               |
| Tests       | Vitest (unit, repositories on `better-sqlite3` using the same `Db` interface), React Testing Library, Playwright (Chromium e2e)                     |

Browser targets: latest Chrome and Edge are primary (File System Access API for saving backups). Firefox must also work; it falls back to normal file downloads. Safari is not a supported target (D-026, human decision 2026-11-16).

## 4. Open decisions and defaults

Use these defaults unless the human says otherwise. Store them as settings where noted.

- Currency: BDT, stored as whole taka (`amount_minor`), shown with South Asian digit grouping.
- Fee model: one-time admission fee plus a monthly fee per enrollment (batch default, overridable per enrollment).
- Discounts: fixed amount or percent per enrollment, plus optional per-charge discount.
- Ranking ties: competition ranking (1, 2, 2, 4).
- Absent in an exam: counts as 0 in totals, is flagged, and is excluded from averages (setting: `absent_counts_as_zero`).
- Leaderboard scopes: per exam, per month, per academic year; filtered by batch or class.
- Grading scale (editable in settings): A+ 80 to 100 (5.00), A 70 to 79 (4.00), A- 60 to 69 (3.50), B 50 to 59 (3.00), C 40 to 49 (2.00), D 33 to 39 (1.00), F below 33 (0).
- Receipt number: `R-YYYY-000001`, sequential, never reused, never changed by edits.
- Student number: `YYYY-0001` by admission year.
- Edit policy: admin may edit anything. Every edit is audited. An edited payment shows a Revised mark and revision count on reprinted receipts.
- Backups: keep the newest 10. Skip an automatic snapshot if the database is unchanged since the last one (compare checksums). Snapshots are taken: on app start if the last is older than 24 hours, before any restore, import, migration, or bulk operation, and on demand.
- Auth: single admin PIN (6 or more digits) enabled in P6; roles Admin, Teacher, Accountant after that.

## 5. Architecture

Data flow: React UI, then TanStack Query hooks, then module services and repositories, then the `Db` client, then the Worker, then sqlite-wasm on OPFS.

```ts
interface Db {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>
  tx<T>(fn: (t: Db) => Promise<T>): Promise<T> // holds the call queue until commit or rollback
  exportBytes(): Promise<Uint8Array>
  importBytes(bytes: Uint8Array): Promise<void>
}
```

The `Db` client serializes every call through one promise queue, so a transaction can never interleave with other calls. The Vitest implementation uses `better-sqlite3` behind the same interface.

Module contract. Every module exports a manifest and registers it in `app/registry.ts`:

```ts
export const studentsModule: AppModule = {
  id: 'students',
  migrations, // ordered SQL files owned by this module
  routes, // lazy route objects
  nav, // menu entry, icon, order
  permissions, // e.g. ['students.read', 'students.write']
}
```

Rules:

- A module owns its tables and migrations. Other modules use only its public `index.ts` (services and types), never its tables.
- Read-model modules (`dashboard`, `reports`, `leaderboard`) are read-only and may query any table, only through files in their own `queries/` folder.
- Modules communicate through a tiny typed event bus (`student.updated`, `payment.created`, ...), mainly to invalidate query caches.
- Migrations are append-only. Never edit a shipped migration; add a new one. Filenames: `YYYYMMDDHHmm_module_description.sql`. Applied versions are tracked in `app_meta.schema_version`.

Folder layout:

```
src/
  app/          shell, registry, providers, router, error boundary
  core/
    db/         worker, client, migrate, repository helpers, uuid, clock
    backup/     snapshots, restore, file export and import
    audit/      audit log writer, undo
    auth/       PIN, session, roles
    i18n/  money/  dates/  print/  export/  ui/
  modules/
    settings/ academics/ students/ enrollments/ payments/
    attendance/ exams/ leaderboard/ dashboard/ reports/ data-tools/
docs/           PLAN.md (this file), PROGRESS.md, DECISIONS.md
e2e/            Playwright specs
```

## 6. Data model

Conventions for every business table:

- `id TEXT PRIMARY KEY` (UUIDv7), `created_at`, `updated_at` (epoch ms), `deleted_at` (NULL unless soft-deleted), `version INTEGER NOT NULL DEFAULT 1` (incremented on every update).
- `PRAGMA foreign_keys = ON` at open. Do not rely on WAL with the sahpool VFS.
- Money columns end in `_minor` and are INTEGER. Booleans are INTEGER 0 or 1.
- Soft delete only. Every default list query filters `deleted_at IS NULL`. Deleting a parent with children is refused with a clear message.
- Updates go through `repo.update(id, patch, expectedVersion)`; a version mismatch aborts so a stale form can never silently overwrite newer data.

Schema (`COMMON` = the five columns above):

```sql
CREATE TABLE app_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE counters(name TEXT PRIMARY KEY, value INTEGER NOT NULL);

CREATE TABLE academic_years(COMMON, name TEXT NOT NULL, starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL, is_current INTEGER NOT NULL DEFAULT 0);
CREATE TABLE classes(COMMON, name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE subjects(COMMON, name TEXT NOT NULL, code TEXT);
CREATE TABLE batches(COMMON, academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  class_id TEXT NOT NULL REFERENCES classes(id), name TEXT NOT NULL,
  days_mask INTEGER NOT NULL,          -- bit 0 = Sunday ... bit 6 = Saturday
  start_time TEXT NOT NULL, end_time TEXT NOT NULL, room TEXT,
  capacity INTEGER, monthly_fee_minor INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active');

CREATE TABLE students(COMMON, student_no TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL,
  gender TEXT, dob TEXT, phone TEXT, guardian_name TEXT, guardian_phone TEXT,
  address TEXT, school_name TEXT, admitted_on TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',   -- active | dropped | passed_out
  notes TEXT);
CREATE TABLE enrollments(COMMON, student_id TEXT NOT NULL REFERENCES students(id),
  batch_id TEXT NOT NULL REFERENCES batches(id), enrolled_on TEXT NOT NULL, left_on TEXT,
  admission_fee_minor INTEGER NOT NULL DEFAULT 0, monthly_fee_minor INTEGER NOT NULL,
  discount_kind TEXT NOT NULL DEFAULT 'none',  -- none | fixed | percent
  discount_value INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active');

CREATE TABLE charges(COMMON, enrollment_id TEXT NOT NULL REFERENCES enrollments(id),
  student_id TEXT NOT NULL REFERENCES students(id), month TEXT,   -- YYYY-MM, NULL for one-off
  kind TEXT NOT NULL,                      -- admission | monthly | other
  description TEXT, amount_minor INTEGER NOT NULL, discount_minor INTEGER NOT NULL DEFAULT 0,
  UNIQUE(enrollment_id, month, kind));
CREATE TABLE payments(COMMON, receipt_no TEXT NOT NULL UNIQUE,
  student_id TEXT NOT NULL REFERENCES students(id), paid_on TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'cash', amount_minor INTEGER NOT NULL, note TEXT,
  status TEXT NOT NULL DEFAULT 'valid',    -- valid | void
  revision INTEGER NOT NULL DEFAULT 0);
CREATE TABLE payment_allocations(payment_id TEXT NOT NULL REFERENCES payments(id),
  charge_id TEXT NOT NULL REFERENCES charges(id), amount_minor INTEGER NOT NULL,
  PRIMARY KEY(payment_id, charge_id));

CREATE TABLE attendance_sessions(COMMON, batch_id TEXT NOT NULL REFERENCES batches(id),
  held_on TEXT NOT NULL, UNIQUE(batch_id, held_on));
CREATE TABLE attendance_records(session_id TEXT NOT NULL REFERENCES attendance_sessions(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  status TEXT NOT NULL,                    -- P | A | L | E (present, absent, late, excused)
  PRIMARY KEY(session_id, student_id));

CREATE TABLE exams(COMMON, batch_id TEXT NOT NULL REFERENCES batches(id),
  subject_id TEXT REFERENCES subjects(id), name TEXT NOT NULL, held_on TEXT NOT NULL,
  full_marks REAL NOT NULL, pass_marks REAL NOT NULL);
CREATE TABLE exam_results(exam_id TEXT NOT NULL REFERENCES exams(id),
  student_id TEXT NOT NULL REFERENCES students(id), marks REAL, absent INTEGER NOT NULL DEFAULT 0,
  remark TEXT, updated_at INTEGER NOT NULL, PRIMARY KEY(exam_id, student_id));

CREATE TABLE audit_log(id TEXT PRIMARY KEY, at INTEGER NOT NULL, user_id TEXT,
  entity TEXT NOT NULL, entity_id TEXT NOT NULL,
  action TEXT NOT NULL,                    -- create | update | delete | restore | void
  before_json TEXT, after_json TEXT, undone INTEGER NOT NULL DEFAULT 0);
```

Required indexes: `students(full_name)`, `students(phone)`, `enrollments(student_id)`, `enrollments(batch_id)`, `charges(student_id, month)`, `payments(student_id, paid_on)`, `attendance_records(student_id)`, `exam_results(student_id)`, `audit_log(entity, entity_id)`. Add FTS5 for student search (name, phone, guardian, student\_no) in P2.

Derived rules (implement once, in the owning module, and reuse everywhere):

- Charge net = `amount_minor - discount_minor`. Paid = sum of allocations of valid payments. Due = net minus paid. Advance = payment amount not yet allocated, allocated automatically when future charges are generated.
- Monthly charges are generated idempotently (the unique key prevents duplicates) for each active enrollment, for a chosen month, on demand and at app start for the current month.
- A voided payment keeps its row and receipt number; its allocations stop counting.
- Rank query uses `RANK() OVER (PARTITION BY scope ORDER BY total_marks DESC)`; ties share a rank.

## 7. Cross-cutting specs

### 7.1 Everything is editable

- Every entity has an Edit action on its list row and detail page: students, enrollments, batches, classes, subjects, charges, payments, attendance, exams, and marks.
- Marks and attendance support fast inline editing in a spreadsheet-like grid (keyboard: arrows, Enter, Tab).
- Every create, update, delete, and void writes an `audit_log` row in the same transaction as the change (`before_json` and `after_json` hold full row snapshots).
- Undo: after any mutation a toast offers Undo for 10 seconds. A History tab on each record lists its audit entries and allows Restore this version. Undo applies the inverse from the audit log and writes a new audit entry (history is never rewritten).
- Editing a payment amount re-runs allocation inside one transaction, increments `revision`, and keeps the receipt number.
- Optimistic concurrency: forms submit `expectedVersion`. On conflict, show the newer values and let the user reload.

### 7.2 Optimistic UI

All mutations use one shared helper so behavior is uniform:

```ts
export function useOptimisticMutation<TVars, TData>(opts: {
  queryKey: QueryKey
  mutationFn: (v: TVars) => Promise<TData>
  applyOptimistic: (old: TData[] | undefined, v: TVars) => TData[]
}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: opts.mutationFn,
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: opts.queryKey })
      const prev = qc.getQueryData<TData[]>(opts.queryKey)
      qc.setQueryData(opts.queryKey, opts.applyOptimistic(prev, v))
      return { prev }
    },
    onError: (err, _v, ctx) => {
      qc.setQueryData(opts.queryKey, ctx?.prev)
      showError(err)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: opts.queryKey }),
  })
}
```

The database is always the source of truth: after settle, refetch. Never apply optimistic updates to receipt numbers, ranks, or any server-derived value; show those after commit.

### 7.3 Backup and restore

- Snapshot = `exportBytes()` of the live database, saved as an OPFS file `/backups/YYYYMMDD-HHmmss_reason.sqlite` with a sidecar `.json` (reason, schema\_version, SHA-256, size, row counts for students and payments). Reasons: auto, manual, pre-restore, pre-migration, pre-import.
- Rotation: keep the newest 10; delete older ones after a successful new snapshot.
- Restore flow (strict order): choose snapshot, validate (checksum, open in a temporary in-memory DB, `PRAGMA integrity_check`, `schema_version` not newer than the app), show a summary diff (student count, payment count, last change time), create a pre-restore snapshot, close the live DB, `importBytes`, run migrations if the snapshot is older, reload the app. If any step fails, keep the live database untouched and show the reason.
- File export and import: Export database (`.sqlite`, optionally AES-GCM encrypted with a passphrase) via `showSaveFilePicker` where available, else a download. Import uses the same validation as restore. Warn on the Backups page when the last file export is older than 7 days, because OPFS snapshots do not survive a cleared browser profile or a dead disk.
- Request persistent storage on first run and show its status in Settings.

### 7.4 Single tab and data safety

- Acquire `navigator.locks.request('app-db-owner', { ifAvailable: true })` at start. If it fails, show a full-screen message: the app is already open in another tab. Release on unload.
- Run migrations inside a transaction after a pre-migration snapshot. A failed migration rolls back and the app shows a recovery screen with Restore and Export options.
- A global error boundary never loses form input; unsaved-changes guard on every form.

### 7.5 Printing and export

- Print routes (`/print/receipt/:paymentId`, `/print/report/:type`) render clean HTML with `@page` CSS (A4 reports, A5 or half-page receipts), then call `window.print()` so the user can pick Save as PDF. Use the self-hosted Bangla font so conjunct letters render correctly.
- Receipt contents: center name and logo, receipt number, date, student name and number, batch, months covered, amount, method, balance due after payment, QR code (receipt number), signature line. A voided receipt is watermarked VOID; a reprint shows DUPLICATE; an edited one shows REVISED n.
- Excel and CSV export every table and report with the same filters the user sees. UTF-8 with BOM for CSV so Excel opens Bangla text correctly.
- Admin report (monthly and per academic year): admissions by class and batch, drop-outs, collected, outstanding dues, collection by method, attendance rate, top performers, expenses (once added), net. Exports as PDF (print) and Excel.
- Optional spike (P8): programmatic PDF download with `pdfmake` and embedded Noto Sans Bengali. Accept only if an automated test confirms Bangla conjuncts render correctly; otherwise keep print-to-PDF.

### 7.6 Import

CSV or Excel import for students, batches, enrollments, and marks. Flow: download template, upload, column mapping, validation preview with row-level errors, dry run, then commit in one transaction after a pre-import snapshot. Imports are idempotent on `student_no` or phone plus name when matching.

### 7.7 Auth and roles (P6)

PIN lock screen after inactivity (default 10 minutes). PIN hashed with PBKDF2 (600,000 iterations, per-user salt) via WebCrypto. Roles: Admin (all), Accountant (payments, dues, reports), Teacher (attendance, marks, read students). Enforce permissions in services, not only in the UI. Be honest in Settings: the SQLite file in OPFS is not encrypted at rest; recommend OS disk encryption, and offer encrypted backup exports.

### 7.8 i18n and accessibility

All strings through i18next keys (no hard-coded text). Toggle English and Bangla, with optional Bangla digits via `Intl.NumberFormat('bn-BD')`. Keyboard navigable, visible focus, labelled inputs, contrast AA, `prefers-reduced-motion` respected. Mobile-friendly layout (tablet at the front desk is likely).

## 8. Module specs

- **settings**: center profile (name, logo as data URI, address, phone), currency, grading scale, receipt format, language, backup status, storage persistence status.
- **academics**: academic years, classes, subjects, batches (schedule clash warning for same room and overlapping time; capacity warning, not a hard block).
- **students**: admission form, edit, soft delete and restore, status changes, photo (small, optional, stored as a compressed blob), search (FTS5) and filters (class, batch, status, dues), profile page with tabs: Overview, Enrollments, Payments, Attendance, Marks (trend chart), History.
- **enrollments**: enroll, transfer between batches (closes one enrollment, opens another, never edits history), discounts, leave date.
- **payments**: generate monthly charges, collect payment (partial, advance, multiple months at once), void, edit, dues list and defaulter view, receipt print and reprint, receipt search.
- **attendance**: open a session for a batch and date, mark all present then adjust, per-student and per-batch percentage.
- **exams**: create exam per batch and subject, grid entry for marks, absent flag, grade and GPA per student, result sheet print.
- **leaderboard**: per exam, per month, per academic year; by batch or class; ties per setting; top N card for the dashboard; printable.
- **dashboard**: this month collection vs due, new admissions, active students, today's batches, low-attendance students, recent exam toppers, backup health warning.
- **reports**: student list, admission report, payment register, dues, receipts by date range, attendance, result sheets, admin report. All filterable, all exportable.
- **data-tools**: backup and restore UI, file export and import, CSV or Excel import, audit log viewer, danger zone (wipe all data requires typing the center name and a fresh export).

## 9. Development phases

Each task lists its acceptance check. Do not skip tests.

**P0 Foundation**

- P0-1 Scaffold Vite + React + TS strict, ESLint, Prettier, Vitest, Playwright, Tailwind, shadcn/ui, folder layout, scripts (`dev`, `build`, `typecheck`, `lint`, `test`, `e2e`). Acceptance: all scripts run clean on an empty app.
- P0-2 Spike: sqlite-wasm in a Worker with `opfs-sahpool`; create a table, insert, reload the page, data persists; `exportBytes` and `importBytes` round-trip. Acceptance: passes in Chrome and Firefox; findings written to `docs/DECISIONS.md`.
- P0-3 `Db` client with serialized queue and `tx`; `better-sqlite3` test double. Acceptance: contract test suite passes on both implementations, including rollback on error.
- P0-4 Migration runner with `schema_version`, module-contributed migrations, pre-migration snapshot hook (stub). Acceptance: migrating an empty DB and a v1 DB yields identical schema.
- P0-5 Core helpers: UUIDv7, clock, money (integer math, format, parse), dates, repository helpers (insert, update with version check, soft delete). Acceptance: unit tests, including money rounding for percent discounts.
- P0-6 App shell, registry, router, error boundary, single-tab lock, PWA, persistent storage request, i18n scaffold (en, bn). Acceptance: installable, works offline, second tab shows the lock screen.

**P1 Safety net first**

- P1-1 Audit log writer wired into the repository helpers (same transaction). Acceptance: any repo write produces a correct before and after.
- P1-2 Snapshots: create, list, rotate to 10, dedupe by checksum. Acceptance: 12 changes produce exactly 10 files.
- P1-3 Restore with validation, summary, and pre-restore snapshot. Acceptance: corrupt or newer-schema file is rejected and the live DB is unchanged; a good restore round-trips data.
- P1-4 File export and import (plain and AES-GCM encrypted). Acceptance: exported file restores on a clean profile.
- P1-5 Undo mechanism and History component (generic, reused by all modules). Acceptance: update, delete, and create can all be undone.
- P1-6 Backups page and the optimistic mutation helper. Acceptance: Playwright test covers snapshot, break data, restore.

**P2 Core records**

- P2-1 Settings module. P2-2 Academics (years, classes, subjects, batches). Acceptance: full CRUD with edit, soft delete, clash and capacity warnings.
- P2-3 Students: admission form, edit, list with virtualization, FTS5 search and filters, profile shell. Acceptance: 5,000 seeded students list and search under 100 ms.
- P2-4 Enrollments and batch transfer. Acceptance: transfer preserves history; capacity warning works.
- P2-5 Seed data generator (`pnpm seed --students 5000`) used by all later tests.

**P3 Money**

- P3-1 Fee rules and monthly charge generation (idempotent). Acceptance: running twice creates no duplicates; discounts correct to the nearest taka.
- P3-2 Record payment with allocation (partial, advance, multi-month) and receipt numbering in a single transaction. Acceptance: property tests show sum of allocations never exceeds payment and receipt numbers are gapless and unique.
- P3-3 Edit and void payment with re-allocation and revision tracking. Acceptance: edited receipt keeps its number and shows REVISED.
- P3-4 Dues list, defaulter filters, student payment tab.
- P3-5 Receipt print route and Export (PDF via print, plus Excel). Acceptance: A5 receipt prints correctly with Bangla text.

**P4 Academics**

- P4-1 Attendance sessions and grid. P4-2 Exams and marks grid with inline edit. P4-3 Grades and GPA from the settings scale. P4-4 Ranking and leaderboard. Acceptance: ties, absent handling, and scope filters match test fixtures.

**P5 Insight**

- P5-1 Dashboard. P5-2 Reports framework (filters, preview, print, Excel, CSV). P5-3 All reports in section 8. P5-4 Admin report (monthly and yearly). Acceptance: report totals equal the sums shown in the payments and students modules for the same range.

**P6 Hardening**

- P6-1 PIN lock and roles with service-level permission checks. P6-2 Import tools with dry run. P6-3 Audit log viewer. P6-4 Performance pass with 5,000 students, 60,000 payments, 200,000 marks. P6-5 Accessibility pass and Bangla review.

**P7 Release**

- P7-1 Playwright end-to-end scenarios (admission to payment to receipt to backup to restore). P7-2 User guide in the app (short, Bangla and English). P7-3 Production build, static hosting instructions, version stamp in Settings.

**P8 Optional extras**

- WhatsApp or SMS link reminders for dues and results, ID cards, admit cards, marksheets, expense tracking, year-end promotion, programmatic PDF spike, Tauri desktop wrapper (the `Db` interface keeps this a small change and gives real file-system backups).

## 10. Quality gates

- Unit tests for money, allocation, ranking, grade conversion, migrations, and backup validation (these are the highest-risk areas).
- Every migration has a test that upgrades a fixture database from each earlier version.
- Every repository has a test for version-conflict and soft-delete behavior.
- CI (or a local script) runs: typecheck, lint, unit tests, build, and Playwright smoke tests before a phase is declared complete.
- Performance budgets: first load under 2 s on a mid-range laptop; list and search under 100 ms at 5,000 students; any report under 2 s at 60,000 payments; initial JS under 300 KB gzipped (lazy-load modules, export libraries, and charts).
- Security: strict CSP (`default-src 'self'`; `connect-src 'none'`), no inline third-party scripts, no `dangerouslySetInnerHTML` with user data, escape all printed values.

## 11. Known risks

- Browsers can evict site storage; mitigated by `persist()`, file export reminders, and the 7-day warning.
- The sahpool VFS allows one connection, which is why the single-tab lock is mandatory.
- Bangla PDF text shaping in JavaScript PDF libraries is unreliable; hence print-based PDF as the default.
- The OPFS database is not encrypted at rest; this is documented to the user, and backups can be encrypted.

## 12. Kickoff prompt for the agent

Read `docs/PLAN.md` completely. Confirm the Locked Decisions and list any Open Decisions you will use defaults for. Then start at P0-1, work one task at a time, and after each task update `docs/PROGRESS.md` and stop to report what you did, the test results, and what you will do next. Ask me before changing anything in sections 3, 6 (schema conventions), or 7.3 (backup and restore).
