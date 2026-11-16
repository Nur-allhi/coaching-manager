# Architecture

How the Coaching Center Manager is put together, and why. The product scope and the
authoritative plan live in [`PLAN.md`](PLAN.md); this document explains the structure that the
plan prescribes.

## 1. The shape of the app

A local-first single-page app. One device, one browser tab, one SQLite database file living
in the browser's OPFS storage. There is no server, no account, no sync.

```
┌──────────────────────────────────────────────────────────────┐
│ React UI  (src/app, src/modules/*)                           │
│   shadcn/ui primitives, TanStack Table + Virtual, Recharts   │
└───────────────┬──────────────────────────────────────────────┘
                │ TanStack Query hooks (reads, optimistic writes)
┌───────────────▼──────────────────────────────────────────────┐
│ Module services  (src/modules/*/services)                    │
│   validation with Zod, permission checks, business rules    │
└───────────────┬──────────────────────────────────────────────┘
                │ typed repositories, hand-written parameterized SQL
┌───────────────▼──────────────────────────────────────────────┐
│ Db client  (src/core/db)                                     │
│   one promise queue → tx() holds the queue until commit      │
└───────────────┬──────────────────────────────────────────────┘
                │ Comlink RPC
┌───────────────▼──────────────────────────────────────────────┐
│ Web Worker  (src/core/db/worker)                             │
│   @sqlite.org/sqlite-wasm on OPFS, opfs-sahpool VFS          │
└──────────────────────────────────────────────────────────────┘
```

UI code never runs SQL. It calls a module service, which calls that module's repository,
which calls the `Db` client.

## 2. The `Db` contract

Everything above the worker talks to one small interface (PLAN §5):

```ts
interface Db {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>
  tx<T>(fn: (t: Db) => Promise<T>): Promise<T>
  exportBytes(): Promise<Uint8Array>
  importBytes(bytes: Uint8Array): Promise<void>
}
```

Two properties make this safe:

- **Serialization.** The client funnels every call through one promise queue, so a
  transaction can never interleave with another statement.
- **One implementation, two runtimes.** The Vitest double uses `better-sqlite3` behind the
  same interface, so repository and service tests run against real SQL in milliseconds, with
  no browser and no wasm.

`tx(fn)` holds the call queue for the duration of `fn`. If `fn` throws, the transaction rolls
back and the queue is released. Nothing outside the transaction sees uncommitted rows.

## 3. Modules

Each feature area is a module with its own tables, migrations, routes and public surface.

```
src/modules/payments/
  index.ts          <- the only thing other modules may import
  migrations/       <- YYYYMMDDHHmm_module_description.sql
  services/         <- business rules, Zod validation, permissions
  repositories/     <- parameterized SQL for this module's tables
  routes/           <- lazy React Router route objects
  queries/          <- read models (dashboard, reports, leaderboard only)
```

The contract:

- A module owns its tables and migrations. Other modules import its `index.ts`, never its
  tables.
- Read-model modules (`dashboard`, `reports`, `leaderboard`) are read-only and may query any
  table, but only from files inside their own `queries/` folder.
- Modules talk to each other through a tiny typed event bus (`student.updated`,
  `payment.created`, …), mostly to invalidate TanStack Query caches.

Every module registers a manifest in `src/app/registry`:

```ts
export const studentsModule: AppModule = {
  id: 'students',
  migrations,
  routes,
  nav,
  permissions: ['students.read', 'students.write'],
}
```

The registry drives the navigation menu, the route tree and the permission checks.

## 4. Storage

- **Database:** SQLite compiled to WebAssembly, opened inside a dedicated Web Worker.
- **VFS:** `opfs-sahpool`. It needs no COOP/COEP headers, unlike the SAH pool VFS, so the app
  can be served from any static host.
- **Persistence:** the database file lives in OPFS. `navigator.storage.persist()` is requested
  on first run; the resulting status is shown in Settings.
- **One connection:** the sahpool VFS allows a single connection, which is why the single-tab
  lock (`navigator.locks`) is mandatory and not a nicety.

### Concurrency

- `navigator.locks.request('app-db-owner', { ifAvailable: true })` is acquired at start. If the
  lock is held, the app shows a full-screen "already open in another tab" message and refuses
  to touch the database.
- `PRAGMA foreign_keys = ON` at open.
- WAL is **not** used with the sahpool VFS.

## 5. Migrations

- Append-only. A shipped migration is never edited; a new one is added.
- Filenames: `YYYYMMDDHHmm_module_description.sql`.
- Applied versions live in `app_meta.schema_version`.
- A migration runs inside a transaction, after a pre-migration snapshot. A failure rolls back
  and the app shows a recovery screen offering Restore and Export.

## 6. Concurrency control on records

Every business row carries `version INTEGER NOT NULL DEFAULT 1`, incremented on every update.
Forms submit `expectedVersion`; a mismatch aborts the write, so a stale form can never
silently overwrite newer data. The UI shows the newer values and offers a reload.

Soft delete only: `deleted_at` is set, the row stays, and every default list query filters
`deleted_at IS NULL`.

## 7. State on the client

| Concern           | Tool                                        | Rule                                              |
| ----------------- | ------------------------------------------- | ------------------------------------------------- |
| Server state      | TanStack Query                              | Every read is a query; every write is a mutation. |
| Optimistic writes | `useOptimisticMutation` (one shared helper) | Roll back on error, refetch on settle.            |
| Tiny UI state     | Zustand                                     | Filters, dialogs, table density. Nothing else.    |
| Form state        | React Hook Form + Zod                       | Validate at the boundary, again in the service.   |

The database is always the source of truth. Optimistic updates never touch derived values —
receipt numbers, ranks, dues — those appear only after the transaction commits.

## 8. Audit and undo

Every create, update, delete and void writes an `audit_log` row **in the same transaction** as
the change, holding the full before and after row snapshots as JSON.

- Undo applies the inverse from the audit log and writes a _new_ audit entry. History is never
  rewritten.
- Each record has a History tab that lists its audit entries and can restore a chosen version.
- After any mutation, a toast offers Undo for 10 seconds.

## 9. Backup and restore

- A snapshot is `exportBytes()` of the live database, written to OPFS as
  `/backups/YYYYMMDD-HHmmss_reason.sqlite` with a `.json` sidecar (reason, schema version,
  SHA-256, size, row counts).
- Rotation keeps the newest 10.
- Restore validates before it touches anything: checksum, open in a temporary in-memory
  database, `PRAGMA integrity_check`, and a schema version not newer than the app's. A
  pre-restore snapshot is taken first. If any step fails, the live database is untouched.
- File export/import adds a portable `.sqlite` file, optionally AES-GCM encrypted with a
  passphrase, using `showSaveFilePicker` where available and a normal download elsewhere.

The full procedure is PLAN §7.3 and is not to be changed without asking the human.

## 10. Rendering, printing, exporting

- PDF is produced by **printing**: dedicated `/print/*` routes render clean HTML with `@page`
  CSS and call `window.print()`. The browser shapes Bangla conjuncts correctly; JavaScript PDF
  libraries do not, reliably.
- Excel is ExcelJS, CSV is PapaParse. CSV is written UTF-8 **with BOM** so Excel opens Bangla
  correctly.
- Every export uses the same filters the user is looking at.

## 11. Offline and the PWA

`vite-plugin-pwa` (Workbox) precaches the app shell. The service worker uses a cache-first
strategy for app assets and network-only for everything else. There is no runtime API to cache,
because there is no server.

The app is installable, works offline, and a second tab is refused by the single-tab lock.

## 12. Security posture

- Strict CSP: `default-src 'self'`, `connect-src 'none'`.
- No inline third-party scripts.
- No `dangerouslySetInnerHTML` with user data; printed values are escaped.
- The OPFS database is **not** encrypted at rest. Settings says so plainly and recommends
  disk encryption, and encrypted backup export is offered.
- PIN hashing uses PBKDF2 via WebCrypto with a per-user salt. Roles are enforced in services,
  not only in the UI.
