import { expect, test, type Page } from '@playwright/test'
import { collectConsoleErrors } from '../helpers/console-errors'
import { collectExternalRequests } from '../helpers/network'

/**
 * T-034 — undo toast + History panel. The dev harness at `/__undo` runs real audited writes
 * through the repo helpers and shows the 10-second Undo toast. Each test gets a fresh context
 * (E2E_TESTING.md §5.5), so the students/audit tables start empty after migrations.
 */
const URL = '/__undo'

async function open(page: Page) {
  await page.goto(URL)
  await expect(page.getByTestId('undo-status')).toHaveText('ready')
}

/** Click Create and wait for the Undo toast (the front toast) to appear. */
async function createWithToast(page: Page) {
  await page.getByTestId('undo-create').click()
  await expect(page.getByTestId('undo-record')).toContainText('Rahim')
  await expect(page.locator('li[data-sonner-toast]')).toBeVisible()
}

/** The newest toast is the front one; sonner marks it with data-front. */
function frontUndo(page: Page) {
  return page
    .locator('li[data-sonner-toast][data-front="true"]')
    .getByRole('button', { name: 'Undo' })
}

test('a create can be undone from the toast', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  const external = collectExternalRequests(page)
  await open(page)

  await createWithToast(page)
  const undoButton = frontUndo(page)
  await expect(undoButton).toBeVisible()

  await undoButton.click()

  await expect(page.getByTestId('undo-record')).toHaveText('none')
  await expect(page.getByTestId('undo-status')).toContainText('created:')
  expect(errors).toEqual([])
  expect(external).toEqual([])
})

test('an update can be undone', async ({ page }) => {
  await open(page)
  await createWithToast(page)
  await page.getByTestId('undo-update').click()
  await expect(page.getByTestId('undo-record')).toContainText('Karim')
  await frontUndo(page).click()
  await expect(page.getByTestId('undo-record')).toContainText('Rahim')
})

test('a delete can be undone', async ({ page }) => {
  await open(page)
  await createWithToast(page)
  await page.getByTestId('undo-delete').click()
  await expect(page.getByTestId('undo-record')).toHaveText('none')
  await frontUndo(page).click()
  await expect(page.getByTestId('undo-record')).toContainText('Rahim')
})

test('the History tab lists entries and restores a chosen version', async ({ page }) => {
  await open(page)
  await createWithToast(page)
  await page.getByTestId('undo-update').click()
  await expect(page.getByTestId('undo-record')).toContainText('Karim')

  const history = page.getByRole('region', { name: 'History' })
  await expect(history.getByText('Created')).toBeVisible()
  await expect(history.getByText('Updated')).toBeVisible()

  // The newest entry is the update to Karim; undoing it restores the before snapshot (Rahim).
  const entries = history.locator('li')
  await entries.first().getByRole('button', { name: 'Restore this version' }).click()
  await expect(page.getByTestId('undo-record')).toContainText('Rahim')
})
