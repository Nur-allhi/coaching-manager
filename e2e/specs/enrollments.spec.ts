import { expect, type Page, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/**
 * T-043 — Enrollments. Acceptance: transfer preserves history, capacity warning appears, and
 * fixed/percent discounts are stored and displayed. Prerequisites come from a fixture route.
 */
test.beforeEach(async ({ page }) => {
  await useEnglish(page)
  await page.goto('/__enrollment-fixture')
  await page.getByTestId('fixture-seed').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
  await page.goto('/enrollments')
})

async function enroll(page: Page, batch: string, kind = 'none', value = '0') {
  await page.getByTestId('enroll-student').selectOption({ label: 'Fixture Student' })
  await page.getByTestId('enroll-batch').selectOption({ label: batch })
  await page.getByTestId('enroll-date').fill('2026-01-10')
  await page.getByTestId('enroll-kind').selectOption(kind)
  await page.getByTestId('enroll-discount').fill(value)
  await page.getByTestId('enroll-save').click()
}

test('enrolls a student with a fixed discount and shows the net fee', async ({ page }) => {
  await enroll(page, 'Batch A', 'fixed', '5000')
  await expect(page.getByTestId('enroll-row')).toHaveCount(1)
  await expect(page.getByTestId('enroll-row')).toContainText('95000')
})

test('enrolls with a percent discount and shows the net fee', async ({ page }) => {
  await enroll(page, 'Batch A', 'percent', '10')
  await expect(page.getByTestId('enroll-row')).toHaveCount(1)
  await expect(page.getByTestId('enroll-row')).toContainText('90000')
})

test('warns on a full batch but still saves the enrollment', async ({ page }) => {
  await enroll(page, 'Batch Small') // capacity 1, no occupancy yet
  await expect(page.getByTestId('enroll-row')).toHaveCount(1)

  // Enroll again into the now-full batch: the warning appears but the save succeeds.
  await page.getByTestId('enroll-student').selectOption({ label: 'Fixture Student' })
  await page.getByTestId('enroll-batch').selectOption({ label: 'Batch Small' })
  await expect(page.getByTestId('enroll-capacity-warning')).toBeVisible()
  await page.getByTestId('enroll-save').click()
  await expect(page.getByTestId('enroll-row')).toHaveCount(2)
})

test('transfers a student and keeps the old enrollment closed in history', async ({ page }) => {
  await enroll(page, 'Batch A')
  await expect(page.getByTestId('enroll-row')).toHaveCount(1)

  await page.getByTestId('enroll-transfer').click()
  await page.getByTestId('enroll-batch').selectOption({ label: 'Batch B' })
  await page.getByTestId('enroll-date').fill('2026-02-01')
  await page.getByTestId('enroll-save').click()

  await expect(page.getByTestId('enroll-row')).toHaveCount(2)
  const rows = page.getByTestId('enroll-row')
  await expect(rows.filter({ hasText: 'Closed' })).toHaveCount(1)
  await expect(rows.filter({ hasText: 'Active' })).toHaveCount(1)
})
