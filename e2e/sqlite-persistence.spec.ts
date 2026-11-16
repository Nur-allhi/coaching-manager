import { expect, test } from '@playwright/test'

const SPIKE_URL = '/__db-spike'

test.describe('sqlite-wasm worker spike', () => {
  // This is a documented platform capability gap, not a hidden failure: the Linux WebKit
  // build used here has no working OPFS (navigator.storage.getDirectory() throws an
  // UnknownError and createSyncAccessHandle is undefined). See DECISIONS.md D-023.
  // Safari on macOS still has to be verified separately.
  test.beforeEach(({ browserName }) => {
    test.skip(
      browserName === 'webkit',
      'OPFS unavailable in the Linux WebKit build — see docs/DECISIONS.md D-023',
    )
  })

  test('persists a row across a page reload', async ({ page }) => {
    await page.goto(SPIKE_URL)
    await expect(page.getByTestId('status')).toHaveText('ready')

    await page.getByRole('button', { name: 'Insert row' }).click()
    await expect(page.getByTestId('row-count')).toHaveText('Rows: 1')
    const before = await page.getByTestId('rows').locator('li').first().textContent()
    expect(before).toContain('row-1')

    await page.reload()
    await expect(page.getByTestId('status')).toHaveText('ready')
    await expect(page.getByTestId('row-count')).toHaveText('Rows: 1')
    await expect(page.getByTestId('rows').locator('li').first()).toHaveText(before!)
  })

  test('export and import round-trip the database bytes', async ({ page }) => {
    await page.goto(SPIKE_URL)
    await expect(page.getByTestId('status')).toHaveText('ready')

    await page.getByRole('button', { name: 'Insert row' }).click()
    await expect(page.getByTestId('row-count')).toHaveText('Rows: 1')
    const before = await page.getByTestId('rows').locator('li').first().textContent()

    await page.getByRole('button', { name: 'Export bytes' }).click()
    await expect(page.getByTestId('status')).toContainText('export: ok')

    await page.getByRole('button', { name: 'Clear rows' }).click()
    await expect(page.getByTestId('row-count')).toHaveText('Rows: 0')

    await page.getByRole('button', { name: 'Import bytes' }).click()
    await expect(page.getByTestId('row-count')).toHaveText('Rows: 1')
    await expect(page.getByTestId('rows').locator('li').first()).toHaveText(before!)
  })

  test('the console stays clean and the page contacts no external host', async ({ page }) => {
    const errors: string[] = []
    const external: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.hostname !== '127.0.0.1' && url.protocol !== 'data:' && url.protocol !== 'blob:') {
        external.push(request.url())
      }
    })

    await page.goto(SPIKE_URL)
    await expect(page.getByTestId('status')).toHaveText('ready')
    await page.getByRole('button', { name: 'Insert row' }).click()
    await expect(page.getByTestId('row-count')).toHaveText('Rows: 1')

    expect(errors).toEqual([])
    expect(external).toEqual([])
  })
})
