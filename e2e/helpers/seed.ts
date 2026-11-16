/**
 * Seed helpers (T-005).
 *
 * The P0 spike harness has no UI for arbitrary data yet, so "seed" means inserting one row
 * through it. Real fixtures for the business modules arrive with their specs.
 */
import { expect, type Page } from '@playwright/test'
import { SPIKE_FIXTURE } from '../fixtures/spike'

export const SPIKE_URL = '/__db-spike'

/** Insert one row into the spike table and wait until the count reflects it. */
export async function seedSpikeRow(page: Page): Promise<void> {
  await page.goto(SPIKE_URL)
  await expect(page.getByTestId('status')).toHaveText('ready')
  await page.getByRole('button', { name: 'Insert row' }).click()
  await expect(page.getByTestId('row-count')).toHaveText('Rows: 1')
  await expect(page.getByTestId('rows')).toContainText(SPIKE_FIXTURE.firstRowValue)
}
