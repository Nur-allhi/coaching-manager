import { expect, type Page, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/**
 * T-042 — Students module. Acceptance: number allocation, FTS search on four identity fields,
 * edit, soft delete and restore from the trash. Each test gets a fresh database context.
 */
test.beforeEach(async ({ page }) => {
  await useEnglish(page)
})

async function admit(page: Page, name: string, phone: string, guardian: string) {
  await page.goto('/students/new')
  // Pin the admission date before asserting the preview, which otherwise defaults to today's year.
  await page.getByTestId('student-admitted').fill('2026-01-15')
  await expect(page.getByTestId('student-number-preview')).toContainText('2026-0001')
  await page.getByTestId('student-name').fill(name)
  await page.getByTestId('student-phone').fill(phone)
  await page.getByTestId('student-guardianName').fill(guardian)
  await page.getByTestId('admission-save').click()
  await expect(page.getByTestId('profile-name')).toHaveText(name)
}

test('admits a student with a YYYY-0001 number and persists the profile', async ({ page }) => {
  await admit(page, 'Rahim Uddin', '01711000001', 'Karim Uddin')
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('profile-overview')).toContainText('2026-0001')

  await page.reload()
  await expect(page.getByTestId('profile-name')).toHaveText('Rahim Uddin')

  // The stored `passed_out` value must render its translated label, not the raw key.
  await page.getByTestId('profile-status-select').selectOption('passed_out')
  await expect(page.getByTestId('profile-status')).toHaveText('Passed out')
})

test('searches by name, phone, guardian and student number', async ({ page }) => {
  await admit(page, 'Rahim Uddin', '01711000001', 'Karim Uddin')
  await page.goto('/students')

  for (const term of ['rahim', '01711000001', 'karim', '2026-0001']) {
    await page.getByTestId('student-search').fill(term)
    await expect(page.getByTestId('student-row').filter({ hasText: 'Rahim Uddin' })).toHaveCount(1)
  }
  await page.getByTestId('student-search').fill('nobody')
  await expect(page.getByTestId('student-row')).toHaveCount(0)
})

test('edits a student and the change survives a reload', async ({ page }) => {
  await admit(page, 'Rahim Uddin', '01711000001', 'Karim Uddin')
  await page.getByTestId('profile-edit').click()
  await page.getByTestId('student-name').fill('Rahim Khan')
  await page.getByTestId('profile-save').click()
  await expect(page.getByTestId('profile-name')).toHaveText('Rahim Khan')
  await page.reload()
  await expect(page.getByTestId('profile-name')).toHaveText('Rahim Khan')
})

test('soft-deletes a student, hides them and restores from the trash', async ({ page }) => {
  await admit(page, 'Rahim Uddin', '01711000001', 'Karim Uddin')
  await page.goto('/students')
  await expect(page.getByTestId('student-row')).toHaveCount(1)

  await page.getByTestId('student-delete').click()
  await expect(page.getByTestId('student-row')).toHaveCount(0)

  await page.getByTestId('toggle-trash').click()
  await expect(page.getByTestId('student-restore')).toBeVisible()
  await page.getByTestId('student-restore').click()
  await expect(page.getByTestId('student-row')).toHaveCount(0)

  await page.getByTestId('toggle-trash').click()
  await expect(page.getByTestId('student-row').filter({ hasText: 'Rahim Uddin' })).toHaveCount(1)
})
