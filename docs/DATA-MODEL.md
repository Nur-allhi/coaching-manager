# Data model

Reference for the schema and the rules that apply to it. The authoritative version is
[`PLAN.md`](PLAN.md) §6; this document explains it and adds the operational details.

**Changing anything in this document, or in PLAN §6, requires the human's approval first.**

## 1. Common columns

Every business table carries the same five columns:

| Column       | Type                         | Meaning                                              |
| ------------ | ---------------------------- | ---------------------------------------------------- |
| `id`         | `TEXT PRIMARY KEY`           | UUIDv7. Time-sortable, never reused.                 |
| `created_at` | `INTEGER`                    | Epoch milliseconds, UTC.                             |
| `updated_at` | `INTEGER`                    | Epoch milliseconds, UTC. Bumped on every write.      |
| `deleted_at` | `INTEGER \| NULL`            | Epoch ms of soft delete. `NULL` means alive.         |
| `version`    | `INTEGER NOT NULL DEFAULT 1` | Incremented on every update. Optimistic concurrency. |

Rules that follow from this:

- **Soft delete only.** Setting `deleted_at` is how a record is removed. The row stays.
- Every default list query filters `deleted_at IS NULL`. Trash views are explicit and separate.
- Updates go through `repo.update(id, patch, expectedVersion)`. A `version` mismatch aborts the
  write; the caller gets a conflict error, not a silent overwrite.
- Deleting a parent that still has children is **refused** with a message the admin can read.

## 2. Column conventions

| Kind      | Convention                         | Example                             |
| --------- | ---------------------------------- | ----------------------------------- |
| Money     | `INTEGER`, column ends in `_minor` | `amount_minor`, `monthly_fee_minor` |
| Boolean   | `INTEGER` 0 or 1                   | `is_current`, `absent`              |
| Date      | `TEXT` `YYYY-MM-DD`                | `admitted_on`, `held_on`            |
| Month     | `TEXT` `YYYY-MM`                   | `charges.month`                     |
| Timestamp | `INTEGER` epoch ms UTC             | `created_at`, `audit_log.at`        |
| Enum-ish  | `TEXT` with a documented value set | `status`, `method`, `discount_kind` |
| Reference | `TEXT` + `REFERENCES other(id)`    | `student_id`                        |

`PRAGMA foreign_keys = ON` at open. WAL is not used with the sahpool VFS.

## 3. Tables

### Metadata

```sql
CREATE TABLE app_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE counters(name TEXT PRIMARY KEY, value INTEGER NOT NULL);
```

- `app_meta` holds `schema_version`.
- `settings` holds the editable settings: grading scale, receipt format, language, currency,
  `absent_counts_as_zero`.
- `counters` allocates gapless sequences (receipt numbers, student numbers).

### Academics

```sql
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
```

`days_mask` is a 7-bit mask, bit 0 = Sunday, bit 6 = Saturday. `bit 0` set means Sunday.
`start_time` and `end_time` are `HH:MM` 24-hour strings.

Two warnings, never hard blocks:

- **Schedule clash:** the same room booked for overlapping times on the same day.
- **Capacity:** more active enrollments than `capacity`.

### People and enrollment

```sql
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
```

A student may be enrolled in several batches. A **transfer** never edits history: it closes
the old enrollment (`left_on`, `status`) and opens a new one.

`discount_value` means paisa when `discount_kind = 'fixed'` and percent (0–100) when
`discount_kind = 'percent'`.

### Money

```sql
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
```

- `charges` is the invoice side: what is owed for a month.
- `payments` is the money side: what was received.
- `payment_allocations` maps a payment onto the charges it settles. A payment may cover
  several months; a charge may be settled by several payments (part payment).

### Attendance

```sql
CREATE TABLE attendance_sessions(COMMON, batch_id TEXT NOT NULL REFERENCES batches(id),
  held_on TEXT NOT NULL, UNIQUE(batch_id, held_on));
CREATE TABLE attendance_records(session_id TEXT NOT NULL REFERENCES attendance_sessions(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  status TEXT NOT NULL,                    -- P | A | L | E (present, absent, late, excused)
  PRIMARY KEY(session_id, student_id));
```

`P` present, `A` absent, `L` late, `E` excused. Excused is not an absence.

### Exams

```sql
CREATE TABLE exams(COMMON, batch_id TEXT NOT NULL REFERENCES batches(id),
  subject_id TEXT REFERENCES subjects(id), name TEXT NOT NULL, held_on TEXT NOT NULL,
  full_marks REAL NOT NULL, pass_marks REAL NOT NULL);
CREATE TABLE exam_results(exam_id TEXT NOT NULL REFERENCES exams(id),
  student_id TEXT NOT NULL REFERENCES students(id), marks REAL, absent INTEGER NOT NULL DEFAULT 0,
  remark TEXT, updated_at INTEGER NOT NULL, PRIMARY KEY(exam_id, student_id));
```

Marks are the one place a `REAL` is correct: exam scores are not money. `absent = 1` means the
student did not sit the exam; `marks` is then `NULL` and the row still exists so the grid
keeps its shape.

### Audit

```sql
CREATE TABLE audit_log(id TEXT PRIMARY KEY, at INTEGER NOT NULL, user_id TEXT,
  entity TEXT NOT NULL, entity_id TEXT NOT NULL,
  action TEXT NOT NULL,                    -- create | update | delete | restore | void
  before_json TEXT, after_json TEXT, undone INTEGER NOT NULL DEFAULT 0);
```

`before_json` and `after_json` hold full row snapshots, so any version can be restored.

## 4. Indexes

Required, and created by the migrations that introduce the tables:

| Index                            | Serves                               |
| -------------------------------- | ------------------------------------ |
| `students(full_name)`            | name search and sorting              |
| `students(phone)`                | phone lookup and import matching     |
| `enrollments(student_id)`        | a student's enrollments              |
| `enrollments(batch_id)`          | a batch's roster                     |
| `charges(student_id, month)`     | a student's monthly charges and dues |
| `payments(student_id, paid_on)`  | a student's payment history          |
| `attendance_records(student_id)` | a student's attendance rate          |
| `exam_results(student_id)`       | a student's marks and trend          |
| `audit_log(entity, entity_id)`   | a record's History tab               |

FTS5 is added in P2 for student search over name, phone, guardian name and student number.

## 5. Derived money rules

These live once, in the owning module, and are reused everywhere.

| Quantity         | Formula                                                          |
| ---------------- | ---------------------------------------------------------------- |
| Charge net       | `amount_minor - discount_minor`                                  |
| Paid on a charge | sum of `payment_allocations.amount_minor` for **valid** payments |
| Due on a charge  | `net - paid`                                                     |
| Advance          | payment amount not yet allocated to any charge                   |

- A **voided** payment keeps its row and its receipt number. Its allocations stop counting.
- Monthly charges are generated **idempotently**. The unique key `(enrollment_id, month, kind)`
  is what prevents duplicates, not a "has this month been generated" flag. Running the
  generator twice creates nothing the second time.
- Charges are generated on demand for a chosen month, and at app start for the current month.
- A payment's allocations never sum to more than the payment amount. Property-tested.
- Editing a payment amount re-runs allocation inside one transaction, increments `revision`,
  and keeps the receipt number.

## 6. Ranking

- Competition ranking: 1, 2, 2, 4. Ties share a rank and the next rank skips.
- Implemented with `RANK() OVER (PARTITION BY scope ORDER BY total_marks DESC)`.
- Scopes: per exam, per month, per academic year. Filter by batch or class.
- A student absent from an exam counts as 0 in totals, is flagged, and is excluded from
  averages. Controlled by the `absent_counts_as_zero` setting.

## 7. Migrations

- Append-only. Never edit a shipped migration.
- Filenames: `YYYYMMDDHHmm_module_description.sql`, e.g.
  `202611160900_students_create_students.sql`.
- Each module contributes its own migrations; the runner applies them in filename order and
  records the applied version in `app_meta.schema_version`.
- A migration runs inside a transaction after a pre-migration snapshot. A failure rolls back
  and the app offers Restore and Export.
- Every migration needs a test that upgrades a fixture database from each earlier version.

## 8. Naming the next migration

Use the UTC timestamp of when you write it, so the order is unambiguous:

```
YYYYMMDDHHmm  →  202611161430
```

Prefix the description with the owning module: `students_create_students`,
`payments_add_payment_revision`, `academics_add_batch_room_index`.
