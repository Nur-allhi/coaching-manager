# FRONTEND_SPEC — Frontend Specification

**Status:** live · **Target skills:** `ui-ux-pro-max`, `frontend-design`, `senior-frontend`

How every screen looks and behaves. Tokens and states are enforceable; prose is not.

---

## 1. Design intent

The admin is standing at a counter with a tablet, often mid-conversation with a parent, often
in Bangla. The design serves that moment, not a demo.

**Three commitments:**

1. **Bangla first.** Bangla is the default language, not a translation layer. Every label has
   a Bangla string; English is the toggle, not the base.
2. **Tablet first.** A 1024×768 tablet on a counter is the primary target. Phone width is a
   floor, not an afterthought. Desktop is a convenience.
3. **Dense, not airy.** An admin scanning 200 students wants rows. Cards floating in
   whitespace are for landing pages.

**Anti-goals:** no hero sections, no marketing copy, no illustration, no emoji as icons, no
gradient panels, no empty dashboard.

## 2. Design tokens

Tokens live in `src/index.css` as CSS variables and are consumed as Tailwind utilities
(`bg-primary`, `text-muted-foreground`). A component MUST NOT hard-code a colour value.

### 2.1 Colour

| Token                            | Light                                  | Dark                               | Use                                     |
| -------------------------------- | -------------------------------------- | ---------------------------------- | --------------------------------------- |
| `--primary`                      | `oklch(0.5 0.11 180)`                  | `oklch(0.72 0.12 180)`             | Primary actions, active nav, focus ring |
| `--background`                   | `oklch(1 0 0)`                         | `oklch(0.145 0 0)`                 | Page                                    |
| `--card`                         | `oklch(1 0 0)`                         | `oklch(0.205 0 0)`                 | Panels, table shells                    |
| `--muted` / `--muted-foreground` | `oklch(0.97 0 0)` / `oklch(0.556 0 0)` | Secondary surfaces, secondary text |
| `--accent`                       | `oklch(0.96 0.02 180)`                 | `oklch(0.3 0.05 180)`              | Row hover, subtle highlight             |
| `--destructive`                  | `oklch(0.577 0.245 27.325)`            | `oklch(0.704 0.191 22.216)`        | Delete, void, wipe                      |
| `--border`                       | `oklch(0.922 0 0)`                     | `oklch(1 0 0 / 12%)`               | Hairlines                               |

Chart colours are `--chart-1` … `--chart-5`, in that order, for any series order.

Rules:

1. Colour MUST NOT carry meaning alone. A due amount is red **and** labelled **and** numeric.
2. The primary colour is reserved for actions and active state. It MUST NOT be used for
   decoration.
3. Destructive colour MUST only appear on a destructive action.
4. Contrast MUST meet AA in both themes. Muted text uses `--muted-foreground`, never a lighter
   grey.

### 2.2 Typography

| Role   | Family                          | Source                           |
| ------ | ------------------------------- | -------------------------------- |
| Latin  | Noto Sans Variable              | `@fontsource-variable/noto-sans` |
| Bangla | Noto Sans Bengali (400/500/700) | `@fontsource/noto-sans-bengali`  |

1. Fonts MUST be self-hosted and bundled. A remote font request is a bug, and
   `e2e/smoke.spec.ts` fails the build if one appears.
2. `:lang(bn)` MUST resolve to the Bengali family, so conjunct letters shape correctly.
3. Body text MUST be at least 16px on mobile. Table body text MAY be 14px on tablet.
4. Line height MUST be 1.5–1.75 for body text.
5. Money and identifiers SHOULD use tabular figures so columns align.

### 2.3 Spacing and radius

- Base unit 4px. Table rows are 40px tall on tablet, 44px minimum for a touch target.
- `--radius: 0.625rem`. Buttons and inputs use `--radius-md`.
- Page padding: 16px on phone, 24px on tablet and up.

## 3. Layout

### 3.1 App shell

```
┌──────────┬──────────────────────────────────────────────┐
│          │  Header: page title · filters · primary action│
│  Sidebar ├──────────────────────────────────────────────┤
│  240px   │                                              │
│          │  Content: table / form / grid                 │
│  Nav     │                                              │
│  Center  │                                              │
│  name    │                                              │
│  + lang  │                                              │
└──────────┴──────────────────────────────────────────────┘
```

- The sidebar is 240px on tablet and wider. Below 768px it collapses into a Sheet, reachable
  from a menu button in the header.
- The header is sticky. The primary action of a screen sits in the header, never at the
  bottom of a scroll.
- The content area scrolls; the shell does not.

### 3.2 Breakpoints

| Name | Width    | Behaviour                                                          |
| ---- | -------- | ------------------------------------------------------------------ |
| base | < 768px  | Single column, sidebar in a sheet, tables drop to priority columns |
| md   | ≥ 768px  | Sidebar visible, two-column forms                                  |
| lg   | ≥ 1024px | Sidebar visible, two-column forms, three-column KPI grid           |
| xl   | ≥ 1280px | Content max-width 1440px, centred                                  |

### 3.3 Navigation

Sidebar order, with the icon from Lucide:

1. Dashboard (`LayoutDashboard`)
2. Students (`Users`)
3. Academics (`CalendarRange`)
4. Enrollments (`UserPlus`)
5. Payments (`Wallet`)
6. Attendance (`CheckSquare`)
7. Exams (`FileText`)
8. Leaderboard (`Trophy`)
9. Reports (`BarChart3`)
10. Data tools (`HardDrive`)
11. Settings (`Settings`)

The sidebar footer holds the centre name, the language toggle, and the backup-health
indicator.

## 4. Route map

| Route                        | Screen                                                                              | Module      |
| ---------------------------- | ----------------------------------------------------------------------------------- | ----------- |
| `/`                          | Dashboard                                                                           | dashboard   |
| `/students`                  | Student list                                                                        | students    |
| `/students/new`              | Admission form                                                                      | students    |
| `/students/:id`              | Student profile (tabs: Overview, Enrollments, Payments, Attendance, Marks, History) | students    |
| `/academics`                 | Years, classes, subjects, batches                                                   | academics   |
| `/enrollments`               | Enrollments and transfers                                                           | enrollments |
| `/payments`                  | Collect a payment                                                                   | payments    |
| `/payments/dues`             | Dues and defaulters                                                                 | payments    |
| `/payments/receipts`         | Receipt search                                                                      | payments    |
| `/attendance`                | Session picker                                                                      | attendance  |
| `/attendance/:batchId/:date` | Attendance grid                                                                     | attendance  |
| `/exams`                     | Exam list                                                                           | exams       |
| `/exams/:id`                 | Marks grid                                                                          | exams       |
| `/leaderboard`               | Rankings                                                                            | leaderboard |
| `/reports`                   | Report catalogue                                                                    | reports     |
| `/reports/:type`             | One report                                                                          | reports     |
| `/data-tools`                | Backup, restore, import, audit log, danger zone                                     | data-tools  |
| `/settings`                  | Centre profile, grading scale, language, storage                                    | settings    |
| `/print/receipt/:paymentId`  | Receipt (print layout)                                                              | payments    |
| `/print/report/:type`        | Report (print layout)                                                               | reports     |

Route modules MUST be lazy-loaded, one per module.

## 5. Screens

### 5.1 Dashboard

The first screen after login. It answers: what came in, what is owed, who is missing, and is
my data safe?

- **KPI row (3–4 cards).** This month collected, this month due, active students, new
  admissions this month. Each card shows the number, a one-line context, and a delta against
  last month. Cards are links to the filtered list behind them.
- **Collection vs due (line chart).** Twelve months, two series. Recharts, from the
  `chart-1` and `chart-2` tokens.
- **Today's batches (list).** Batch name, time, room, student count, attendance status.
- **Low attendance (list).** Students under 75%, each a link to their profile.
- **Recent toppers (list).** Top three per recent exam.
- **Backup health (banner).** Shown when the last file export is older than 7 days, or the
  last snapshot is older than 24 hours. Never a toast — it needs dismissing.

### 5.2 Student list

The screen the admin lives in.

- Sticky header with the search field, filter chips, and "New admission".
- Search matches name, student number, phone and guardian. Results are capped and the
  count is shown ("1 of 2,318 students").
- Filters: class, batch, status, dues. Each is a removable chip.
- Table columns: student number, name, class/batch, phone, monthly fee, due, status, actions.
  "Due" is the column the admin scans, so it is right-aligned, tabular, and coloured only
  when non-zero.
- Rows are virtualized above 50 rows. The row height is fixed.
- Every row has an edit action and a profile link.
- Empty state: "No students match these filters." with a "Clear filters" button and a "New
  admission" link. Never a blank table.

### 5.3 Student profile

Tabbed: Overview · Enrollments · Payments · Attendance · Marks · History.

- **Overview** — identity card, status, totals (admitted, collected, outstanding), notes.
- **Payments** — the payment history table and the outstanding dues list for this student.
- **Attendance** — a per-student percentage and a monthly bar chart.
- **Marks** — a trend line of exam totals.
- **History** — the audit trail for this record, newest first, with "Restore this version" on
  each entry.

### 5.4 Collect a payment — the money screen

The most important screen in the product. It MUST show three numbers, always, before the
money changes hands:

```
┌──────────────────────────────────────────────────────────┐
│ Student: Rahim Uddin          2026-0142 · HSC-26 A       │
├──────────────────────────────────────────────────────────┤
│  Total due        3,000        Paid         1,000        │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Month      Fee    Paid    Due                      │  │
│  │ 2026-08   1,000    1,000      0                    │  │
│  │ 2026-09   1,000      0    1,000                    │  │
│  │ 2026-10   1,000      0    1,000                    │  │
│  └────────────────────────────────────────────────────┘  │
│  Amount taken  [ 2,000 ]   Method [ Cash ▾ ]            │
│  Advance after this payment        0                    │
├──────────────────────────────────────────────────────────┤
│  Balance due after this payment             1,000      │
│  [Cancel]                                    [Take 2,000]│
└──────────────────────────────────────────────────────────┘
```

Rules:

1. The amount field MUST be pre-filled with the total due, and MUST update when the user
   edits it: the "advance after this payment" and "balance due after this payment" figures
   MUST recompute live.
2. The submit button MUST show the amount, not the word "Submit".
3. The button MUST be disabled while the transaction runs, so a double tap cannot create two
   payments.
4. The receipt number MUST NOT be shown before the payment commits. It appears on the receipt.
5. On success a toast offers **Undo** for 10 seconds.

### 5.5 Attendance grid

Spreadsheet behaviour, because the admin does this for 40 students in five minutes.

| Student | Name | P   | A   | L   | E   |
| ------- | ---- | --- | --- | --- | --- |

- "Mark all present" is one action at the top of the grid.
- Arrow keys move between cells. **Enter** moves down, **Tab** moves right.
- The focused cell is clearly ringed; the row and column headers stay visible while
  scrolling.
- `P` `A` `L` `E` are the only statuses. Excused is not an absence.
- The grid MUST NOT re-sort while the admin is editing it.
- Autosaves on blur; a small "Saved" indicator confirms it.

### 5.6 Marks grid

Same behaviour as the attendance grid, plus a number input per cell.

- Absent is a separate toggle, not a zero. An absent cell shows "A", not "0".
- The live average for the batch updates as marks are entered.
- Grade and GPA come from the grading scale in Settings and are shown beside each student.

### 5.7 Leaderboard

- Scope selector: per exam, per month, per academic year.
- Filter: by batch or by class.
- Rank, student, batch, total marks, grade. Tied ranks share a row treatment.
- Printable.

### 5.8 Reports

A catalogue on `/reports`; each report is a filter bar, a preview table, and the export
buttons. The export always uses the filters currently shown.

### 5.9 Admin report

Monthly and per academic year. Sections: admissions by class and batch, drop-outs, collected,
outstanding dues, collection by method, attendance rate, top performers, net.

### 5.10 Data tools

- **Backups** — the list of snapshots with reason, size, date, and the last file export date,
  with the stale-export warning.
- **Restore** — choose a snapshot, validate, show a summary diff, then restore.
- **Import** — template download, upload, column mapping, validation preview, dry run, commit.
- **Audit log** — the filterable table of every change.
- **Danger zone** — wipe all data, behind typing the centre name.

### 5.11 Receipt (print layout)

`/print/receipt/:paymentId`, A5 or half-page.

Centre name and logo · receipt number · date · student name and number · batch · months
covered · amount · method · balance due after payment · a QR code of the receipt number · a
signature line.

- A voided receipt is watermarked **VOID**.
- A reprint is watermarked **DUPLICATE**.
- An edited receipt shows **REVISED n**.
- Bangla uses the self-hosted Bengali family so conjuncts shape correctly.
- All user-supplied values are escaped.

## 6. Component inventory

**From shadcn/ui** (generated, `src/components/ui/`, never hand-edited): button, input,
textarea, label, field, select, checkbox, switch, radio-group, table, tabs, card, badge,
dialog, alert-dialog, sheet, drawer, dropdown-menu, popover, tooltip, command, calendar,
sidebar, separator, skeleton, spinner, progress, scroll-area, slider, pagination, sonner.

**Application components** (in `src/core/ui/` or the owning module): `DataTable`, `FilterBar`,
`MoneyCell`, `DueBadge`, `StatusBadge`, `StudentPicker`, `ChargeTable`, `AttendanceGrid`,
`MarksGrid`, `KpiCard`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `ConfirmDialog`,
`HistoryPanel`, `UndoToast`, `PrintHeader`.

Rules:

1. A component file MUST stay under 300 LOC. When a component grows past that, it is split,
   not enlarged.
2. A list that can exceed a screen MUST use TanStack Table for columns and TanStack Virtual
   for rows.
3. Every component that fetches MUST handle four states: loading, empty, error, content.
4. Every icon-only button MUST have an `aria-label`.
5. No component may hard-code a user-visible string. All strings come from i18next keys.

## 7. States

| State             | Treatment                                                                     |
| ----------------- | ----------------------------------------------------------------------------- |
| Loading           | Skeletons that match the final layout. No spinners over content.              |
| Empty             | A title, one sentence of what to do next, and an action button.               |
| Error             | What went wrong, what the admin can do, and a retry button.                   |
| Offline           | Not a special state. The app is always offline; there is nothing to announce. |
| Permission denied | A clear message, not a blank page.                                            |
| Conflict          | The newer values are shown next to the form, with a "Reload" button.          |

## 8. Accessibility

These are part of the Definition of Done, not a phase.

1. Every input MUST have a `<label>` bound with `htmlFor`. A placeholder MUST NOT be the only
   label.
2. Every interactive element MUST show a visible focus ring. The base stylesheet provides it;
   a component MUST NOT remove it.
3. Contrast MUST meet AA in both themes.
4. Every flow MUST be fully operable by keyboard alone.
5. `prefers-reduced-motion` MUST be respected. The base stylesheet disables animation.
6. Touch targets MUST be at least 44×44px on touch layouts.
7. Colour MUST NOT be the only indicator of state.
8. The layout MUST work at 360px wide without horizontal scrolling.
9. Tab order MUST follow visual order.
10. Status changes announced by a toast MUST also be reachable in the UI afterwards; the
    toast is never the only record of something.

## 9. Icons

Lucide only, one consistent set, 16px inside controls and 20px in navigation. No emoji as
icons. A missing icon is not a licence to substitute a character.

## 10. Anti-patterns

| Do not                                         | Why                                            |
| ---------------------------------------------- | ---------------------------------------------- |
| Use a modal-on-modal                           | The admin loses the context behind the dialog. |
| Hide a required field behind a "show more"     | The admin will miss it.                        |
| Use a spinner over a page                      | It hides the layout shift.                     |
| Put a destructive action next to a primary one | Mistaps.                                       |
| Put "Save" at the bottom of a long form        | The admin has to scroll back.                  |
| Use a toast as the only report of an error     | Toasts disappear.                              |
| Animate a layout on hover                      | It makes the table jitter.                     |

## 11. Related documents

| Document                           | Holds                                                   |
| ---------------------------------- | ------------------------------------------------------- |
| [`PRD.md`](PRD.md)                 | The workflows these screens serve.                      |
| [`TAD.md`](TAD.md)                 | The state management and module boundaries behind them. |
| [`E2E_TESTING.md`](E2E_TESTING.md) | How these screens are proven.                           |
| [`REPO_RULES.md`](REPO_RULES.md)   | The code conventions a component MUST follow.           |
