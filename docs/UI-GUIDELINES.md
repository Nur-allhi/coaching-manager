# UI guidelines

The coaching center admin is standing at a front desk with a tablet, often mid-conversation
with a parent, often in Bangla. The UI is built for that person, not for a demo.

## 1. Who this is for

- **Primary user:** the admin. Busy, not a computer person, may be interrupted at any moment.
- **Device:** a tablet at the front desk; a phone is possible; a desktop is possible.
- **Language:** Bangla and English, switchable at any time, with no restart.
- **Network:** none. The app works on a tablet that has never seen the internet since the last
  sync of settings.

## 2. The four screens that matter most

In rough order of daily use:

1. **Collect a fee.** Find the student, see what is owed, take the money, print the receipt.
2. **Admit a new student.** Form, enrollment, first charge, first receipt.
3. **Mark attendance.** Open the session, adjust, done.
4. **Check a result.** Find the exam, see marks and grades, print the sheet.

Design these four first and make them fast. Everything else can wait.

## 3. Layout

- **Tablet first.** The primary layout is a left sidebar (navigation) plus a content area.
  Below the tablet breakpoint the sidebar collapses into a sheet.
- **Dense, not spacious.** An admin scanning a list of 200 students wants rows, not cards
  floating in whitespace.
- **Sticky table headers**, and the primary action for a screen sits in a fixed header bar, not
  at the bottom of a scroll.
- **One primary action per screen.** Everything else is secondary, ghost or a dropdown.
- **The filter bar is always visible**, showing the active filters as removable chips, with a
  "clear all" when more than one is set.

## 4. Typography and language

- Bangla text uses **Noto Sans Bengali**, self-hosted, at every weight the UI uses. The
  `:lang(bn)` rule pins the Bengali family so conjuncts shape correctly.
- Latin text uses Noto Sans.
- **Never mix scripts in one word.** A Bangla label with an English word inside it is fine
  (`ফি কালেকশন`), but never a Bangla label with a Latin technical term.
- Numbers: Latin digits by default. Bangla digits are an optional setting, via
  `Intl.NumberFormat('bn-BD')`.
- Money is shown in whole taka with the currency word, not a symbol the admin has to decode.
  `৳ ১৫০০` when Bangla digits are on, `BDT 1,500` otherwise.
- Dates: `16 নভেম্বর ২০২৬` in Bangla, `16 Nov 2026` in English. Always the local Dhaka date.

## 5. Colour

- The theme is a calm teal (`oklch(0.5 0.11 180)`), chosen to read as professional and calm
  rather than as a SaaS landing page.
- Colour never carries meaning alone. A due amount is not "red text"; it is red text **and** a
  label **and** a number.
- Semantic colours are reserved: destructive only for destructive actions, warning for
  attention, success for confirmed outcomes.
- Both light and dark themes must pass contrast AA. Dark mode exists because a front desk at
  night is dim.

## 6. Tables and lists

- TanStack Table for columns, TanStack Virtual for rows. A list of 5,000 students renders like
  a list of 30.
- **Every row has an edit action.** Everything is editable; that is a product rule, not a
  nicety.
- Sortable columns show the sort direction in the header. Filters and sorts are reflected in
  the URL so a filtered view can be shared or bookmarked.
- **Every list has an empty state that tells the admin what to do next**, not "No data".
- Long names truncate with a tooltip, never wrap and break the row rhythm.

## 7. Forms

- React Hook Form with a Zod resolver. Validate on blur, re-validate on change once a field
  has been touched.
- **Never lose input.** The error boundary preserves form state; an unsaved-changes guard
  warns before navigating away.
- Labels above fields, always. Placeholders show an example, never the label.
- Required fields are marked. Optional fields are not marked — that is the default.
- The submit button shows a spinner and disables while in flight, so a double tap cannot
  create two payments.
- **On a version conflict** — someone else edited the record while this form was open — show
  the newer values and offer a reload. Never silently overwrite.
- Numbers: amount fields accept digits only, and show the formatted value on blur.

## 8. Money screens

- Amounts are always shown with the currency and the word "due", "paid" or "advance".
- A payment screen shows the total due **before** the payment, the amount being taken, and the
  balance after — all three, always.
- Receipt numbers are shown prominently, in a monospace-ish weight, because the admin reads
  them out loud over the phone.
- A voided receipt is watermarked VOID, a reprint is watermarked DUPLICATE, and an edited
  receipt shows REVISED with the revision count.

## 9. Grids (attendance and marks)

Spreadsheet behaviour, because the admin does this for 40 students in five minutes:

- Arrow keys move between cells; **Enter** moves down, **Tab** moves right.
- Typing replaces the cell value and moves on.
- The cell being edited is clearly marked, and the row and column headers stay visible.
- A batch can be marked all-present in one action, then adjusted.
- The grid never re-sorts under the admin's cursor.

## 10. Feedback and undo

- Every mutation gives a toast with **Undo**, for 10 seconds.
- The toast is the only place Undo appears. The History tab on the record is the permanent
  version list.
- Errors are shown as a message that says what to do next, not a stack trace.
- A long operation shows progress and can be cancelled where that is meaningful.

## 11. Accessibility

Not a phase, not a checklist at the end. Part of the definition of done.

- Every input has a label.
- Visible focus on everything focusable.
- Contrast AA, including in dark mode.
- `prefers-reduced-motion` respected.
- Fully keyboard operable, including the grids.
- Screen-reader friendly names on icon-only buttons.
- The layout works at 360 px wide even if the admin only ever uses a tablet.

## 12. Printing

Print routes are separate HTML, not a print stylesheet over the app screen. They use `@page`
CSS: A4 for reports, A5 or half-page for receipts.

- A receipt shows: centre name and logo, receipt number, date, student name and number, batch,
  months covered, amount, method, balance due after payment, a QR code of the receipt number,
  and a signature line.
- Bangla renders through the self-hosted Noto Sans Bengali so conjuncts are correct in print.
- Printed values are escaped. Nothing user-supplied becomes markup.

## 13. Performance in the UI

- A 5,000-student list must feel instant: virtualize, index, and paginate server-side.
- Search feels instant: debounce, and search on the server side of the `Db` call, not by
  loading all rows and filtering in JavaScript.
- Route modules are lazy-loaded, so the first screen is small.
- Skeletons, not spinners, for content that is loading.

## 14. Offline

- Nothing in the UI implies a server. No "sync", no "cloud", no refresh button that means
  "fetch again".
- Errors caused by the offline state are phrased in terms of what the admin can do next, not
  in terms of the network.

## 15. Anti-patterns

- No hero sections, no gradient marketing copy, no illustration on an admin screen.
- No emoji as icons.
- No modal-on-modal.
- No icon-only button without an accessible name.
- No colour-only status.
- No infinite scroll on a list the admin needs to reach the bottom of to count.
- No toast as the only place an error is reported.
