import { expect, test } from '@playwright/test'
import { collectConsoleErrors } from '../helpers/console-errors'

test('a broken database can be restored from its newest snapshot', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/__snapshots')
  await expect(page.getByTestId('snapshot-status')).toHaveText('ready')

  await page.getByTestId('change-data').click()
  await expect(page.getByTestId('data-count')).toHaveText('1')
  await page.getByTestId('take-snapshot').click()
  await expect(page.getByTestId('snapshot-count')).toHaveText('1')

  await page.getByTestId('break-data').click()
  await expect(page.getByTestId('data-count')).toHaveText('0')

  await page.getByTestId('restore').click()
  await expect(page.getByTestId('snapshot-status')).toContainText('restored')
  await expect(page.getByTestId('data-count')).toHaveText('1')
  // The chosen snapshot plus the forced pre-restore copy written before the import.
  await expect(page.getByTestId('snapshot-count')).toHaveText('2')
  expect(errors).toEqual([])
})
