import { expect, test, type Page } from '@playwright/test'

/**
 * T-035 — Backups page. Acceptance: list snapshots with reason/size/date; warn when the last
 * file export is >7 days old; mutations use the shared helper. E2E covers snapshot → break data
 * → restore → data back, driving the real Backups page and a test-only fixture route to seed/break.
 */
const BACKUPS = '/data-tools'
const FIXTURE = '/__backup-fixture'

async function seed(page: Page) {
  await page.goto(FIXTURE)
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
  await page.getByTestId('fixture-seed').click()
  await expect(page.getByTestId('fixture-value')).toHaveText('FixtureStudent')
}

test('the page lists snapshots with reason, size and date', async ({ page }) => {
  await seed(page)
  await page.goto(BACKUPS)
  await expect(page.getByRole('heading', { name: 'Backups' })).toBeVisible()

  await page.getByRole('button', { name: 'Take snapshot' }).click()

  const entry = page.locator('li').filter({ hasText: 'manual' })
  await expect(entry).toBeVisible()
  await expect(entry).toContainText('manual')
  await expect(entry).toContainText(/KB|B/)
  await expect(entry).toContainText(/\d{1,2} [A-Z][a-z]{2} \d{4}|\d{4}-\d{2}-\d{2}/)
})

test('the page warns when the last file export is older than 7 days', async ({ page }) => {
  await page.goto(BACKUPS)
  const warning = page.getByRole('alert')
  await expect(warning).toContainText('over 7 days')
  await warning.getByRole('button', { name: 'Dismiss' }).click()
  await expect(warning).toHaveCount(0)
})

test('a snapshot, break data, restore flow brings the data back', async ({ page }) => {
  await seed(page)

  await page.goto(BACKUPS)
  await page.getByRole('button', { name: 'Take snapshot' }).click()
  const entry = page.locator('li').filter({ hasText: 'manual' })
  await expect(entry).toBeVisible()

  // Break the live data via the fixture, confirm it changed.
  await page.goto(FIXTURE)
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
  await page.getByTestId('fixture-break').click()
  await expect(page.getByTestId('fixture-value')).toHaveText('BROKEN')

  // Restore from the Backups page.
  await page.goto(BACKUPS)
  await page
    .locator('li')
    .filter({ hasText: 'manual' })
    .getByRole('button', { name: 'Restore' })
    .click()
  await expect(page.getByTestId('backup-status')).toHaveText('restored', { timeout: 15_000 })

  await page.goto(FIXTURE)
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
  await expect(page.getByTestId('fixture-value')).toHaveText('FixtureStudent')
})
