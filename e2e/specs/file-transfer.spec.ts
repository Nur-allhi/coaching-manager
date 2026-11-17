import { expect, test, type Page } from '@playwright/test'
import { collectConsoleErrors } from '../helpers/console-errors'
import { collectExternalRequests } from '../helpers/network'

/**
 * T-033 — portable file export/import. The dev harness at `/__file-transfer` runs the real
 * export→wipe→import flow with real OPFS + WebCrypto and holds the exported bytes in memory.
 * Each test gets a fresh browser context (E2E_TESTING.md §5.5).
 */
const URL = '/__file-transfer'

async function open(page: Page) {
  await page.goto(URL)
  await expect(page.getByTestId('transfer-status')).toHaveText('ready')
}

test('an exported file restores on a clean database', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  const external = collectExternalRequests(page)
  await open(page)

  await page.getByTestId('add-row').click()
  await expect(page.getByTestId('transfer-count')).toHaveText('1')

  await page.getByTestId('export-plain').click()
  await expect(page.getByTestId('transfer-status')).toContainText('exported:')

  // Wipe the live table, then import the exported bytes back.
  await page.getByTestId('wipe').click()
  await expect(page.getByTestId('transfer-count')).toHaveText('0')

  await page.getByTestId('import-plain').click()
  await expect(page.getByTestId('transfer-status')).toHaveText('imported')
  await expect(page.getByTestId('transfer-count')).toHaveText('1')

  expect(errors).toEqual([])
  expect(external).toEqual([])
})

test('an encrypted export restores with the correct passphrase', async ({ page }) => {
  await open(page)
  await page.getByTestId('add-row').click()
  await expect(page.getByTestId('transfer-count')).toHaveText('1')

  await page.getByTestId('export-encrypted').click()
  await expect(page.getByTestId('transfer-status')).toContainText('exported:')

  await page.getByTestId('wipe').click()
  await expect(page.getByTestId('transfer-count')).toHaveText('0')

  await page.getByTestId('import-encrypted').click()
  await expect(page.getByTestId('transfer-status')).toHaveText('imported')
  await expect(page.getByTestId('transfer-count')).toHaveText('1')
})

test('an encrypted export fails with a wrong passphrase and leaves data unchanged', async ({
  page,
}) => {
  await open(page)
  await page.getByTestId('add-row').click()
  await expect(page.getByTestId('transfer-count')).toHaveText('1')

  await page.getByTestId('export-encrypted').click()
  await expect(page.getByTestId('transfer-status')).toContainText('exported:')

  await page.getByTestId('wipe').click()
  await expect(page.getByTestId('transfer-count')).toHaveText('0')

  await page.getByTestId('import-wrong-passphrase').click()
  await expect(page.getByTestId('transfer-status')).toHaveText('error: WrongPassphraseError')
  await expect(page.getByTestId('transfer-count')).toHaveText('0')
})
