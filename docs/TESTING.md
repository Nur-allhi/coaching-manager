# Testing strategy

What is tested, how, and what "done" means for a test.

## 1. The three layers

| Layer      | Tool                           | What it covers                                                                  | Runs in |
| ---------- | ------------------------------ | ------------------------------------------------------------------------------- | ------- |
| Unit       | Vitest                         | Money, allocation, ranking, grades, migrations, backup validation, repositories | ms      |
| Component  | Vitest + React Testing Library | Forms, states, optimistic updates, undo, grids                                  | ms      |
| End-to-end | Playwright (Chromium)          | Real user journeys: admit → pay → receipt → backup → restore                    | ~s      |

The Vitest layer uses a `better-sqlite3` implementation of the same `Db` interface the browser
uses, so repository and service tests exercise real SQL against a real engine, with no browser
and no wasm.

## 2. Priority order

PLAN §10 names the highest-risk areas. Money is first, and it stays first.

1. **Money** — integer arithmetic, percent discount rounding, allocation, totals.
2. **Allocation** — partial payment, advance payment, multi-month payment, void, edit.
3. **Ranking and grades** — ties, absent handling, scope filters, GPA conversion.
4. **Migrations** — every migration upgrades a fixture from each earlier version.
5. **Backup validation** — checksum, integrity check, schema version, pre-restore snapshot.
6. **Repositories** — version conflict, soft delete, audit before/after, for every repository.
7. **UI** — states, keyboard, Bangla, accessibility.

## 3. Rules for a test

- **A test names the behaviour, not the function.** `it('keeps the receipt number when the
amount is edited')`, not `it('calls updatePayment')`.
- **One behaviour per test.** If the name needs "and", split it.
- **No implementation detail assertions.** Assert on the observable result, not on which
  internal function ran.
- **Deterministic.** No wall-clock time, no random data, no network. Inject a fake clock.
- **Money tests use paisa integers**, never `"1000"` strings, so a rounding bug cannot hide
  behind a convenient value.
- **Edge cases are the point**: zero, one paisa, an amount that rounds up, a payment of
  exactly the due amount, a payment of one paisa more.

## 4. Testing money

```ts
it('rounds a percent discount to the nearest paisa', () => {
  expect(applyPercentDiscount(3333, 15)).toBe(500) // 499.95 → 500
  expect(applyPercentDiscount(3332, 15)).toBe(500)
  expect(applyPercentDiscount(3330, 15)).toBe(500)
  expect(applyPercentDiscount(1000, 7)).toBe(70) // exactly 70
})
```

Property tests (P3-2) cover the invariants:

- The sum of a payment's allocations never exceeds the payment amount.
- Allocations are never negative.
- Receipt numbers are unique and gapless.
- `net - paid` is never negative for a settled charge.

## 5. Testing repositories

Every repository gets the same three tests. They are a template, not optional:

```ts
it('rejects an update with a stale expectedVersion', ...)
it('hides soft-deleted rows from list queries', ...)
it('writes an audit entry with the before and after rows', ...)
```

## 6. Testing migrations

For each migration, a fixture database at each earlier version is migrated forward and the
resulting schema is compared against the expected schema. The acceptance line for the
migration runner is that migrating an empty database and migrating a v1 database yield an
identical schema.

## 7. Component tests

- Render with real providers (query client, router, i18n). A test helper will provide these.
- Assert on roles and accessible names, not on CSS classes or test ids.
- Every async component is checked for all four states: loading, empty, error, content.
- Use `userEvent`, not `fireEvent`.

## 8. End-to-end tests

Playwright runs against the **production build** (`vite preview`), not the dev server, so the
service worker and the bundler are exercised too.

The P1-6 and P7-1 journeys:

```
admission → enrollment → monthly charge → payment → receipt print
          → break the data → snapshot → restore → data is back
```

Because the database lives in the browser, a fresh Playwright context is a fresh database.
That is the natural reset: no fixture teardown needed.

## 9. The offline test

`e2e/smoke.spec.ts` fails if the page contacts any host other than its own origin. It is the
cheapest possible guard on the "no runtime network calls" rule and it must never be deleted or
weakened.

## 10. Quality gates

Before a phase is declared complete, all of these pass:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

Or in one command: `pnpm check` (everything except `e2e`), plus `pnpm e2e`.

## 11. Performance budgets

From PLAN §10. These are budgets, not aspirations, and regressions are bugs.

| Budget                  | Target                          |
| ----------------------- | ------------------------------- |
| First load              | under 2 s on a mid-range laptop |
| Student list and search | under 100 ms at 5,000 students  |
| Any report              | under 2 s at 60,000 payments    |
| Initial JavaScript      | under 300 KB gzipped            |

How to keep them:

- Lazy-load one route per module; lazy-load export libraries and chart bundles.
- Use TanStack Virtual for long lists — never render 5,000 rows.
- Index the columns that are actually filtered or sorted.
- Keep the initial JS small: a component that is not on the first screen should not be in the
  first chunk.

## 12. Accessibility testing

- Every interactive element is reachable and operable by keyboard.
- Every input has an accessible name.
- Focus is visible.
- Contrast meets AA.

The automated part is a linting and snapshot concern; the real check is the
`senior-frontend` and `ui-ux-pro-max` skills plus a human pass in the P6-5 review.

## 13. Coverage

Coverage is a diagnostic, not a target. A high number on `src/components/ui` (generated) means
nothing. What matters is that the money, allocation, ranking, grade, migration and backup
paths are fully covered. Read the V8 report from `pnpm coverage` for the uncovered branches in
`src/core` and `src/modules`, not for the overall percentage.
