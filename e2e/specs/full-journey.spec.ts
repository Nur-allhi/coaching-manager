import { expect, test } from '@playwright/test'
import { collectConsoleErrors } from '../helpers/console-errors'
import { useEnglish } from '../helpers/locale'

/**
 * T-090 / PLAN P7-1 — one committed journey: admission → payment → receipt → backup → restore.
 *
 * Setup uses the repo's test-only fixture routes (the same pattern as payments.spec.ts and
 * backups.spec.ts). Every acceptance outcome is asserted on a real product screen, and the
 * restore proves the journey's own student and payment came back, not just that a file exists.
 */
test('a student is admitted, pays, gets a receipt, and is recovered from a backup', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page)
  await useEnglish(page)

  // Admission preconditions: year, class, batch, enrollment and generated charges. The fixture
  // admits the student with number 2026-0001; the assertions below are on product screens.
  await page.goto('/__payment-fixture')
  await page.getByTestId('fixture-seed').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
  await expect(page.getByTestId('fixture-student-name')).toHaveText('Fixture Student')

  // 1. Admission — the real Students list and profile show the admitted student and number.
  await page.goto('/students')
  const studentRow = page.getByTestId('student-row').filter({ hasText: 'Fixture Student' })
  await expect(studentRow).toContainText('2026-0001')
  await studentRow.getByRole('link', { name: 'Fixture Student' }).click()
  await expect(page.getByTestId('profile-name')).toHaveText('Fixture Student')
  await expect(page.getByTestId('profile-overview')).toContainText('2026-0001')
  const profileUrl = page.url()

  // 2. Payment — a partial payment leaves the correct remainder and a receipt number.
  await page.goto('/payments')
  await page.getByTestId('pay-student').selectOption({ label: 'Fixture Student' })
  await expect(page.getByTestId('dues-total')).toHaveText('60')
  await page.getByTestId('pay-amount').fill('20')
  await page.getByTestId('payment-save').click()
  await expect(page.getByTestId('payment-receipt')).toContainText('R-2026-000001')
  await expect(page.getByTestId('dues-total')).toHaveText('40')
  const paymentId = await page.getByTestId('payment-row').first().getAttribute('data-payment-id')
  expect(paymentId).toBeTruthy()

  // 3. Receipt — the A5 print route shows the receipt, the payer and the balance after payment.
  await page.goto(`/print/receipt/${paymentId}`)
  await expect(page.getByTestId('receipt-page')).toBeVisible()
  await expect(page.getByTestId('receipt-no')).toContainText('R-2026-000001')
  await expect(page.getByTestId('receipt-student')).toContainText('Fixture Student')
  await expect(page.getByTestId('receipt-student-no')).toContainText('2026-0001')
  await expect(page.getByTestId('receipt-amount')).toContainText('20')
  await expect(page.getByTestId('receipt-balance')).toContainText('40')

  // 4. Backup — the real Backups page writes a snapshot of the journey's live data.
  await page.goto('/data-tools')
  await page.getByRole('button', { name: 'Take snapshot' }).click()
  const snapshot = page.locator('li').filter({ hasText: 'manual' })
  await expect(snapshot).toBeVisible()

  // 5. Break — corrupt the journey student and prove the real profile sees the damage.
  await page.goto('/__payment-fixture')
  await page.getByTestId('fixture-break').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('broken')
  await expect(page.getByTestId('fixture-student-name')).toHaveText('BROKEN')
  await page.goto(profileUrl)
  await expect(page.getByTestId('profile-name')).toHaveText('BROKEN')

  // 6. Restore — the real Backups page brings the journey's data back.
  await page.goto('/data-tools')
  await snapshot.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByTestId('backup-status')).toHaveText('restored', { timeout: 15_000 })

  // 7. Every leg is back: the student's name, the payment and the receipt.
  await page.goto(profileUrl)
  await expect(page.getByTestId('profile-name')).toHaveText('Fixture Student')
  await page.goto('/payments')
  await page.getByTestId('pay-student').selectOption({ label: 'Fixture Student' })
  await expect(page.getByTestId('row-receipt')).toHaveText('R-2026-000001')
  await expect(page.getByTestId('dues-total')).toHaveText('40')
  await page.goto(`/print/receipt/${paymentId}`)
  await expect(page.getByTestId('receipt-no')).toContainText('R-2026-000001')

  expect(errors).toEqual([])
})
