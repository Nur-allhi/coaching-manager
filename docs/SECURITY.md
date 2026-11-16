# SECURITY — Security & Access

**Status:** live · **Target skills:** `senior-backend`, `code-reviewer`

What the product protects, how, and what it explicitly does not protect. Enforceable rules
are written as MUST / MUST NOT with a one-line reason, so `code-reviewer` can fail a change
against them.

---

## 1. Threat model

The product runs on the admin's own device with no server. That removes the entire class of
remote attacks and introduces a different one: the device, and the admin, are the trust
boundary.

| Asset                   | Who can hurt it                  | How                                               |
| ----------------------- | -------------------------------- | ------------------------------------------------- |
| Student and fee records | Someone with the device          | Physical access, a stolen unlocked laptop         |
| The database file       | Browser storage eviction         | Clearing site data, a dead disk, a full disk      |
| Backups                 | File system access               | An unencrypted `.sqlite` file sits in plain sight |
| The audit trail         | Anyone who can edit the database | Tampering, if the DB is edited outside the app    |
| The PIN                 | Brute force                      | A weak PIN, or an unlocked device                 |

Out of scope for v1, and therefore out of scope for this document: remote multi-user
attacks, server-side vulnerabilities, and network interception (there is no network).

## 2. Trust boundaries

1. **UI → service.** The UI is untrusted input. Every value is re-validated by Zod in the
   service. The UI's own validation is for fast feedback, never for correctness.
2. **Service → repository → SQL.** Parameters are bound. Identifiers (table and column names)
   are the only interpolated values, and they come from code, never from input.
3. **Repository → worker.** Comlink RPC over a `MessagePort`. The worker owns the SQLite
   connection; the UI thread never touches it.
4. **Worker → OPFS.** One connection only, enforced by the single-tab lock.

## 3. Authentication

The product has one human user in v1.

1. A single admin PIN, **6 or more digits**, is enabled in P6.
2. The PIN MUST be hashed with **PBKDF2, 600,000 iterations, a per-user random salt**, via
   WebCrypto. A plain hash, a low iteration count, or a reused salt MUST NOT be accepted.
3. The PIN MUST NOT be logged, exported into backups in readable form, or included in an
   `audit_log` `before_json`/`after_json` payload.
4. The lock screen MUST appear after **10 minutes of inactivity** by default, and the timeout
   MUST be configurable.
5. Failed attempts MUST NOT reveal whether the PIN exists or how many digits were correct.

## 4. Authorization

Three roles. Enforcement is in **services**, not only in the UI — a hidden button is not a
control.

| Permission         | Admin | Accountant | Teacher |
| ------------------ | ----- | ---------- | ------- |
| `students.read`    | yes   | no         | yes     |
| `students.write`   | yes   | no         | no      |
| `payments.read`    | yes   | yes        | no      |
| `payments.write`   | yes   | yes        | no      |
| `dues.read`        | yes   | yes        | no      |
| `reports.read`     | yes   | yes        | no      |
| `attendance.read`  | yes   | no         | yes     |
| `attendance.write` | yes   | no         | yes     |
| `exams.read`       | yes   | no         | yes     |
| `exams.write`      | yes   | no         | yes     |
| `settings.read`    | yes   | no         | no      |
| `settings.write`   | yes   | no         | no      |
| `backup.read`      | yes   | no         | no      |
| `backup.restore`   | yes   | no         | no      |
| `audit.read`       | yes   | no         | no      |

Rules:

1. A service MUST check the required permission before it writes, and MUST check the read
   permission before it returns a row containing personal or financial data.
2. A service MUST NOT accept a role, a user id, or a permission as a parameter from the
   caller. The role comes from the session.
3. `backup.restore` and the danger-zone wipe MUST require the Admin role **and** the typed
   centre name, and MUST create a pre-operation snapshot first.

## 5. Data guardrails

These protect the data itself. They are the highest-value rules in this document.

1. **Money is never a float.** Amounts are integer paisa in `*_minor` columns. A float MUST
   NOT appear in a money column, a money parameter, or a money calculation. Reason: 0.1 + 0.2
   is not 0.3, and a fee ledger that drifts is a fee ledger that cannot be trusted.
2. **No hard deletes.** Records are soft-deleted with `deleted_at`; every default list query
   filters `deleted_at IS NULL`. Reason: the admin must be able to undo a mistake.
3. **Every write is audited.** The `audit_log` row MUST be written in the same transaction as
   the change. Reason: a log written outside the transaction can disagree with the data.
4. **Optimistic concurrency.** Every update MUST go through `repo.update(id, patch,
expectedVersion)`, and a version mismatch MUST abort the write. Reason: a stale form must
   never silently overwrite newer data.
5. **Allocations are bounded.** The sum of a payment's allocations MUST NOT exceed the
   payment amount, and allocations MUST NOT be negative. Reason: it is the invariant the
   whole dues calculation rests on.
6. **Receipt numbers are never reused or renumbered.** Reason: a receipt is an artefact the
   admin reads out loud and the parent keeps.
7. **Danger-zone wipe** MUST require typing the centre name exactly, MUST require a fresh
   export, and MUST create a snapshot before it runs. Reason: it is irreversible.

## 6. Cryptography

WebCrypto only. No third-party crypto library.

| Use               | Algorithm      | Detail                                                      |
| ----------------- | -------------- | ----------------------------------------------------------- |
| PIN hashing       | PBKDF2-SHA-256 | 600,000 iterations, 16-byte random salt per user            |
| Backup checksums  | SHA-256        | Over the raw bytes of the exported file                     |
| Encrypted backups | AES-GCM        | Random 12-byte IV per file, passphrase-derived key          |
| IDs               | UUIDv7         | Not security-sensitive, but non-guessable and time-sortable |

1. The AES-GCM IV MUST be random per encryption and MUST NOT be reused.
2. The passphrase MUST NOT be stored, logged, or included in an export manifest.
3. A checksum mismatch MUST abort a restore before anything is written to the live database.

## 7. Storage reality, stated honestly

The OPFS database is **not encrypted at rest**. Anyone with the device's filesystem and the
browser profile can read it.

The Settings page MUST say this plainly, MUST recommend full-disk encryption, and MUST offer
an encrypted backup export. Reason: a product that implies protection it does not have is
worse than one that is blunt about it.

## 8. Input handling

1. Every value entering a service MUST be validated by Zod at that boundary. Reason: the UI
   is not the only possible caller.
2. SQL MUST use bound parameters. Identifiers MAY be interpolated only from a fixed
   allowlist in code. Reason: string-built SQL is injectable.
3. The app MUST NOT use `dangerouslySetInnerHTML`, `eval`, `new Function`, or
   `document.write`. Reason: all four turn stored data into code.
4. Printed values MUST be escaped. Reason: a student named `<script>` must print as text.
5. File names from an import MUST be validated against the expected extension and MUST NOT be
   used to build a path outside the chosen directory. Reason: path traversal.
6. Imports MUST be idempotent on `student_no`, or phone plus name. Reason: importing the same
   file twice MUST NOT duplicate students.

## 9. Offline guarantee and CSP

1. The app MUST make **no** runtime request to any host other than its own origin. No
   analytics, no CDN, no remote fonts, no cloud APIs. Enforced by `e2e/smoke.spec.ts`.
2. The Content-Security-Policy MUST be delivered as an HTTP header, not a `<meta>` tag.
   Reason: a meta tag also applies in development and breaks Vite's HMR websocket.
3. The policy MUST be `default-src 'self'` with `script-src 'self'`, `object-src 'none'`,
   `base-uri 'self'`, `frame-ancestors 'none'`, and `worker-src 'self' blob:`.
4. `connect-src` MUST be `'self'`, not `'none'`. Reason: the service worker fetches its own
   precached assets from the app's origin; `'none'` breaks offline start-up. Same-origin only
   still guarantees no third-party call.
5. `style-src` MAY include `'unsafe-inline'`. Reason: Radix positions overlays with inline
   style attributes, which CSP cannot express any other way.

The policy itself lives in `public/_headers`.

## 10. Single-tab lock

1. The app MUST acquire `navigator.locks.request('app-db-owner', { ifAvailable: true })` at
   start, and MUST refuse to touch the database if the lock is held. Reason: the sahpool VFS
   allows one connection, and a second writer corrupts the file.
2. The lock MUST be released on unload.

## 11. Supply chain

1. Every GitHub Action MUST be pinned to a commit SHA, never a moving tag. Reason: a tag is
   a mutable pointer, and a compromised action runs in every fork's CI.
2. The workflow MUST declare `permissions: contents: read` and MUST use no secrets and no
   write scopes.
3. `pnpm.onlyBuiltDependencies` MUST list every package allowed to run a postinstall script.
   Reason: a postinstall script is arbitrary code execution at install time.
4. The lockfile MUST be committed and CI MUST install with `--frozen-lockfile`.
5. A secret that reaches git MUST be **rotated**, not merely deleted from history. Reason:
   deleting it from history does not un-publish it.

## 12. Logging

1. No PIN, passphrase, full phone number, or full student record may appear in a log line, an
   `audit_log` payload, or an error message shown to the admin.
2. Errors shown to the admin MUST say what to do next. Reason: the admin is at a counter.

## 13. Review checklist

`code-reviewer` fails a change if any of these is true:

- [ ] A money value became a float.
- [ ] SQL was built by string concatenation.
- [ ] A write happened outside a transaction that also writes its audit row.
- [ ] A list query lost its `deleted_at IS NULL` filter.
- [ ] An update bypassed the `expectedVersion` check.
- [ ] `dangerouslySetInnerHTML`, `eval`, `new Function` or `document.write` was introduced.
- [ ] A permission check was added only in the UI.
- [ ] A new dependency runs a postinstall script without being allow-listed.
- [ ] A new outbound request was introduced.
- [ ] A secret, absolute host path or personal identifier was committed.
- [ ] A file grew past 300 LOC, or dead code was introduced.

## 14. Known limitations

| Limitation                                                       | Mitigation                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| The database is not encrypted at rest                            | Full-disk encryption advice; encrypted backup export             |
| Browser storage can be evicted                                   | `persist()`, file-export reminders, a 7-day stale-export warning |
| One tab only                                                     | The single-tab lock, with a clear message                        |
| A physical attacker with the unlocked device can read everything | PIN lock after inactivity, OS disk encryption                    |
| PDF export is print-based, not programmatic                      | Chosen deliberately: the browser shapes Bangla correctly         |

## 15. Related documents

| Document                           | Holds                                              |
| ---------------------------------- | -------------------------------------------------- |
| [`TAD.md`](TAD.md)                 | The schema and layering these rules protect.       |
| [`REPO_RULES.md`](REPO_RULES.md)   | Merge rules and the Definition of Done.            |
| [`E2E_TESTING.md`](E2E_TESTING.md) | The suite that proves the offline guarantee holds. |
| [`BUGS.md`](BUGS.md)               | The queue of known security issues.                |
