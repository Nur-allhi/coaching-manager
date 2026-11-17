import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/** T-082 — a real audited change is listed with before/after, and filters narrow the log. */
test.beforeEach(async ({ page }) => {
  await useEnglish(page)
  await page.goto('/__undo')
  await expect(page.getByTestId('undo-status')).toHaveText('ready')
  await page.getByTestId('undo-create').click()
  await expect(page.getByTestId('undo-status')).toContainText('created:')
})

test('lists a change with its entity, action and before/after snapshots', async ({ page }) => {
  await page.goto('/data-tools/audit')
  await expect(page.getByTestId('audit-table')).toBeVisible()
  await expect(page.getByTestId('audit-row-entity').first()).toHaveText('students')
  await expect(page.getByTestId('audit-row-action').first()).toHaveText('create')

  await page.getByTestId('audit-details').first().locator('summary').click()
  await expect(page.getByTestId('audit-after').first()).toContainText('Rahim')
})

test('filters by action and by date range', async ({ page }) => {
  await page.getByTestId('undo-update').click()
  await expect(page.getByTestId('undo-status')).toHaveText('updated')
  await page.goto('/data-tools/audit')

  await page.getByTestId('audit-action').selectOption('update')
  await expect(page.getByTestId('audit-row-action')).toHaveText('update')

  await page.getByTestId('audit-action').selectOption('')
  const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)
  await page.getByTestId('audit-from').fill(tomorrow)
  await expect(page.getByTestId('audit-empty')).toBeVisible()
})
