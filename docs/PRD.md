# PRD — Coaching Manager

**Status:** live · **Owner:** the human · **Plan of record:** [`PLAN.md`](PLAN.md)

This document states _what the product is for_. How it is built lives in
[`TAD.md`](TAD.md); what is allowed lives in [`SECURITY.md`](SECURITY.md) and
[`REPO_RULES.md`](REPO_RULES.md).

---

## 1. Vision

A single-device, offline-first application that lets a coaching center admin run the whole
front desk from one screen: admit a student, take a fee, mark attendance, record an exam,
and print a receipt — without an internet connection, an account, or a server.

The product succeeds when a busy admin can answer "who owes what, and can I print the receipt
right now?" in under a minute, at a tablet on the counter, in Bangla, while a parent waits.

## 2. Problem

Coaching centers in Bangladesh run on paper registers and spreadsheets. That produces four
concrete failures:

| Failure                  | Consequence                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| Fees tracked by hand     | Students are overcharged, or dues are silently written off.           |
| Attendance in a register | Low-attendance students are not noticed until they fail.              |
| No audit trail           | A wrong entry cannot be explained or undone.                          |
| No backup                | A dead disk or a cleared browser profile erases the season's records. |

The product removes the paper and keeps the speed.

## 3. User

**Primary — the admin.** Runs the centre. Non-technical. Works at a tablet on the front desk.
Owns fees, admissions and staff records. May be interrupted mid-task at any moment.

**Secondary — the teacher.** Marks attendance and exam marks. (Roles land in P6.)

**Tertiary — the accountant.** Reconciles collections, dues and the admin report. (P6.)

**Out of scope for v1:** students, parents, and any external portal.

## 4. v1 scope

### In

1. **Academics** — academic years, classes, subjects, batches (days, time slot, room,
   capacity, monthly fee).
2. **Students** — admission, full profile, photo, search, filters, soft delete and restore,
   status changes.
3. **Enrollments** — enroll into one or more batches, transfer between batches, discounts,
   leave date.
4. **Money** — monthly charge generation, payments (partial, advance, multi-month), dues
   list, receipt print and reprint, void and edit with revision tracking.
5. **Attendance** — a session per batch and date, a fast grid, per-student and per-batch
   percentages.
6. **Exams** — exam per batch and subject, marks grid, absent flag, grade and GPA, result
   sheet print.
7. **Leaderboard** — per exam, per month, per academic year; filtered by batch or class.
8. **Dashboard** — collection vs due, admissions, active students, today's batches,
   low-attendance students, recent toppers, backup health.
9. **Reports** — student list, admissions, payment register, dues, receipts by range,
   attendance, result sheets, admin report. All filterable, all exportable.
10. **Everything is editable** — every record, with a full audit trail and undo.
11. **Safety** — automatic snapshots (newest 10), restore, and file export/import of the whole
    database.

### Out

Cloud sync, multi-device, online payments, SMS gateway, student/parent portal, and any
runtime network call of any kind.

## 5. Critical workflows

These are the journeys the product exists for. Each one becomes a Playwright `@smoke` spec
(see [`E2E_TESTING.md`](E2E_TESTING.md)).

### W1 — Collect a fee

> Find the student → see what is owed → take the money → print the receipt.

Acceptance: the student is found in under two seconds from name or number; the screen shows
due, amount taken, and balance after **before** the money is handed over; the receipt prints
with a receipt number, the months covered, and the balance due.

### W2 — Admit a student

> Fill the form → enroll in a batch → first charge → first receipt.

Acceptance: the student gets a student number `YYYY-0001` by admission year; the enrollment
carries the batch's monthly fee; the admission fee and first month are charged together; the
receipt from W1 prints.

### W3 — Mark attendance

> Open today's session → mark all present → adjust the absentees → save.

Acceptance: one action marks the whole batch present; adjustments take one keystroke per
student; the session is unique per batch and date; per-student and per-batch percentages
update immediately.

### W4 — Record an exam and publish results

> Create the exam → enter marks in a grid → flag absents → publish the result sheet.

Acceptance: absent students are flagged, count as zero in totals, and are excluded from
averages; grades and GPA come from the settings scale; ranking uses competition ranking
(1, 2, 2, 4); the result sheet prints.

### W5 — Recover from a mistake

> Notice the wrong amount → undo it → or restore an older version → or restore the database
> from a snapshot.

Acceptance: undo is offered for 10 seconds after any change; every record has a History tab;
a restore from snapshot returns the database to a known-good state without losing the
ability to recover again.

### W6 — Take the data away

> Export the database to a file → keep it safe → import it on a new machine.

Acceptance: the export restores on a clean profile; the file may be AES-GCM encrypted; the
Backups page warns when the last file export is older than 7 days.

## 6. Success criteria

| Criterion               | Target                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| First load              | under 2 s on a mid-range laptop                                        |
| Student list and search | under 100 ms at 5,000 students                                         |
| Any report              | under 2 s at 60,000 payments                                           |
| Initial JavaScript      | under 300 KB gzipped                                                   |
| Money errors            | zero — allocations never exceed a payment; receipt numbers are gapless |
| Data loss               | zero — every write is audited; no record is hard-deleted               |
| Runtime network calls   | zero — enforced by a failing test                                      |

## 7. Non-goals

- Multi-user collaboration or any server component.
- Anything that requires the internet to work.
- Money held as a float, anywhere.
- A "simple mode" that hides fees or attendance from the admin.

## 8. Assumptions

1. One device, one browser tab at a time. The app refuses to open a second tab.
2. The device is reasonably modern; the primary form factor is a tablet.
3. Bangla and English are both first-class. Bangla digits are optional, off by default.
4. The admin is trusted with all data. Roles exist to separate duties, not to hide money.

## 9. Open questions for the human

Recorded in [`DECISIONS.md`](DECISIONS.md) as they are answered. The current set is empty;
`PLAN.md` §4 lists the defaults in force until then.

## 10. Related documents

| Document                               | Holds                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------- |
| [`PLAN.md`](PLAN.md)                   | The build plan: phases, task IDs, acceptance lines. The plan of record. |
| [`TAD.md`](TAD.md)                     | Architecture, data model, module boundaries.                            |
| [`SECURITY.md`](SECURITY.md)           | Auth, roles, guardrails, threat model.                                  |
| [`FRONTEND_SPEC.md`](FRONTEND_SPEC.md) | Tokens, layout, screens, states, accessibility.                         |
| [`TICKETS.md`](TICKETS.md)             | The execution queue.                                                    |
| [`E2E_TESTING.md`](E2E_TESTING.md)     | The Playwright protocol.                                                |
