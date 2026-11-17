import { expect, test } from '@playwright/test'
import { generateStudents } from '../../scripts/seed-data.ts'
import { useEnglish } from '../helpers/locale'

/**
 * T-044 — the e2e suite consumes the same deterministic generator as `pnpm seed` and the
 * performance benchmark. The fixture route seeds the browser database with generated rows.
 */
test('seeded students render in the real list and are searchable', async ({ page }) => {
  await useEnglish(page)
  const rows = generateStudents(50, 1)
  const target = rows[7]
  expect(target).toBeDefined()

  await page.goto('/__seed-fixture')
  await page.getByTestId('seed-count').fill('50')
  await page.getByTestId('seed-go').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('50')

  await page.goto('/students')
  await expect(page.getByTestId('students-count')).toContainText('50')

  // The number is unique even though generated names can repeat.
  await page.getByTestId('student-search').fill(target!.student_no)
  await expect(page.getByTestId('student-row')).toHaveCount(1)
  await expect(page.getByTestId('student-row')).toContainText(target!.full_name)
})
