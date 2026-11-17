import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/** T-061 — exam + marks grid. Seed a batch/subject/roster/exam, then drive the real /exams/:id grid. */

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
  await page.goto('/__marks-fixture')
  await page.getByTestId('fixture-seed').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
  const examId = await page.getByTestId('fixture-exam-id').textContent()
  expect(examId).toBeTruthy()
  await page.goto(`/exams/${examId}`)
  await expect(page.getByTestId('exam-title')).toHaveText('Midterm')
})

test('enters marks and flags one absent — the average excludes the absent student', async ({
  page,
}) => {
  await expect(page.getByTestId('exam-average')).toHaveText('—')
  await expect(page.getByTestId('marks-input')).toHaveCount(3)

  for (const [i, mark] of ['80', '70', '90'].entries()) {
    await page.getByTestId('marks-input').nth(i).fill(mark)
    await page.keyboard.press('Enter')
  }
  await expect(page.getByTestId('exam-average')).toHaveText('80')
  await expect(page.getByTestId('entered-count')).toHaveText('3')

  // Asha is the third student; flag her absent. Her cell shows "A", not a zero.
  await page.getByTestId('absent-toggle').nth(2).click()
  await expect(page.getByTestId('absent-cell')).toHaveCount(1)
  await expect(page.getByTestId('absent-cell')).toHaveText('A')
  await expect(page.getByTestId('marks-input')).toHaveCount(2)
  await expect(page.getByTestId('exam-average')).toHaveText('75')
  await expect(page.getByTestId('entered-count')).toHaveText('2')
  await expect(page.getByTestId('absent-count')).toHaveText('1')
})

test('arrow keys move focus and Space flags absence', async ({ page }) => {
  const inputs = page.getByTestId('marks-input')
  await inputs.first().focus()
  await expect(inputs.first()).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(inputs.nth(1)).toBeFocused()

  await page.keyboard.press('Space')
  await expect(page.getByTestId('absent-cell')).toHaveCount(1)
  await expect(page.getByTestId('absent-count')).toHaveText('1')
  await expect(page.getByTestId('marks-input')).toHaveCount(2)
})

test('marks and absence persist across a reload', async ({ page }) => {
  await page.getByTestId('marks-input').nth(0).fill('80')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('save-state')).toHaveText('saved')

  await page.getByTestId('absent-toggle').nth(1).click()
  await expect(page.getByTestId('absent-cell')).toHaveCount(1)
  await expect(page.getByTestId('save-state')).toHaveText('saved')

  await page.reload()
  await expect(page.getByTestId('exam-average')).toHaveText('80')
  await expect(page.getByTestId('absent-cell')).toHaveCount(1)
  await expect(page.getByTestId('marks-input')).toHaveCount(2)
})
