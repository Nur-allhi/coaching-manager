import { expect, test } from '@playwright/test'
import { collectConsoleErrors } from '../helpers/console-errors'
import { collectExternalRequests } from '../helpers/network'
import { seedSpikeRow, SPIKE_URL } from '../helpers/seed'

test.describe('sqlite-wasm worker spike', () => {
  test('persists a row across a page reload', async ({ page }) => {
    await seedSpikeRow(page)
    const before = await page.getByTestId('rows').locator('li').first().textContent()
    expect(before).toContain('row-1')

    await page.reload()
    await expect(page.getByTestId('status')).toHaveText('ready')
    await expect(page.getByTestId('row-count')).toHaveText('Rows: 1')
    await expect(page.getByTestId('rows').locator('li').first()).toHaveText(before!)
  })

  test('export and import round-trip the database bytes', async ({ page }) => {
    await seedSpikeRow(page)
    const before = await page.getByTestId('rows').locator('li').first().textContent()

    await page.getByRole('button', { name: 'Export bytes' }).click()
    await expect(page.getByTestId('status')).toContainText('export: ok')

    await page.getByRole('button', { name: 'Clear rows' }).click()
    await expect(page.getByTestId('row-count')).toHaveText('Rows: 0')

    await page.getByRole('button', { name: 'Import bytes' }).click()
    await expect(page.getByTestId('row-count')).toHaveText('Rows: 1')
    await expect(page.getByTestId('rows').locator('li').first()).toHaveText(before!)
  })

  test('a transaction that throws rolls back every write inside it', async ({ page }) => {
    await seedSpikeRow(page)

    await page.getByRole('button', { name: 'Rollback test' }).click()
    await expect(page.getByTestId('status')).toHaveText('rollback: ok')
    await expect(page.getByTestId('row-count')).toHaveText('Rows: 1')
    await expect(page.getByTestId('rows')).not.toContainText('should-not-exist')
  })

  test('the console stays clean and the page contacts no external host', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    const external = collectExternalRequests(page)

    await page.goto(SPIKE_URL)
    await expect(page.getByTestId('status')).toHaveText('ready')
    await page.getByRole('button', { name: 'Insert row' }).click()
    await expect(page.getByTestId('row-count')).toHaveText('Rows: 1')

    expect(errors).toEqual([])
    expect(external).toEqual([])
  })
})
