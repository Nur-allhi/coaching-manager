import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/** T-060 — attendance session + grid. Seed a batch+roster, then drive the real /attendance grid. */
const GRID = '/attendance/b-1/2026-02-01'

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
  await page.goto('/__attendance-fixture')
  await page.getByTestId('fixture-seed').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
  await page.goto(GRID)
  await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible()
})

test('one action marks the whole batch present', async ({ page }) => {
  await expect(page.getByTestId('attendance-percentage')).toHaveText('0%')
  await page.getByTestId('mark-all-present').click()
  await expect(page.getByTestId('attendance-percentage')).toHaveText('100%')
  await expect(page.getByTestId('present-count')).toHaveText('3')
  await expect(page.getByTestId('absent-count')).toHaveText('0')
  await expect(page.getByTestId('status-cell')).toHaveCount(3)
  for (const cell of await page.getByTestId('status-cell').all()) {
    await expect(cell).toHaveAttribute('data-status', 'present')
  }
})

test('changing one student to absent updates the percentage', async ({ page }) => {
  await page.getByTestId('mark-all-present').click()
  await expect(page.getByTestId('attendance-percentage')).toHaveText('100%')

  // Asha is the third cell; toggle her to absent.
  await page.getByTestId('status-cell').nth(2).click()
  await expect(page.getByTestId('status-cell').nth(2)).toHaveAttribute('data-status', 'absent')
  await expect(page.getByTestId('attendance-percentage')).toHaveText('67%')
  await expect(page.getByTestId('present-count')).toHaveText('2')
  await expect(page.getByTestId('absent-count')).toHaveText('1')
})

test('arrow keys move focus, Enter toggles a cell', async ({ page }) => {
  await page.getByTestId('mark-all-present').click()
  const cells = page.getByTestId('status-cell')
  await cells.first().focus()
  await expect(cells.first()).toBeFocused()

  // ArrowDown moves focus to the second cell.
  await page.keyboard.press('ArrowDown')
  await expect(cells.nth(1)).toBeFocused()

  // Enter toggles the focused cell to absent.
  await page.keyboard.press('Enter')
  await expect(cells.nth(1)).toHaveAttribute('data-status', 'absent')
  await expect(page.getByTestId('attendance-percentage')).toHaveText('67%')
})

test('a session is unique per batch and date', async ({ page }) => {
  await page.getByTestId('mark-all-present').click()
  await expect(page.getByTestId('save-state')).toHaveText('saved')
  // Reloading the same batch+date must reuse the session, not error on a UNIQUE violation.
  await page.reload()
  await expect(page.getByTestId('attendance-percentage')).toHaveText('100%')
  await expect(page.getByTestId('status-cell')).toHaveCount(3)
})
