import { expect, test } from '@playwright/test'
import { collectConsoleErrors } from '../helpers/console-errors'
import { collectExternalRequests } from '../helpers/network'

test('twelve changes leave ten snapshots with complete sidecars', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  const external = collectExternalRequests(page)
  await page.goto('/__snapshots')
  await expect(page.getByTestId('snapshot-status')).toHaveText('ready')

  for (let i = 1; i <= 12; i += 1) {
    await page.getByTestId('change-data').click()
    await expect(page.getByTestId('change-count')).toHaveText(String(i))
    await page.getByTestId('take-snapshot').click()
    await expect(page.getByTestId('snapshot-count')).toHaveText(String(Math.min(i, 10)))
  }

  const sidecar = JSON.parse((await page.getByTestId('last-sidecar').textContent()) ?? '{}')
  expect(sidecar).toMatchObject({
    reason: 'manual',
    schemaVersion: expect.any(Number),
    sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    size: expect.any(Number),
    students: expect.any(Number),
    payments: expect.any(Number),
  })
  expect(errors).toEqual([])
  expect(external).toEqual([])
})

test('an unchanged database does not create another snapshot', async ({ page }) => {
  const external = collectExternalRequests(page)
  await page.goto('/__snapshots')
  await expect(page.getByTestId('snapshot-status')).toHaveText('ready')

  await page.getByTestId('change-data').click()
  await page.getByTestId('take-snapshot').click()
  await expect(page.getByTestId('snapshot-count')).toHaveText('1')

  await page.getByTestId('take-snapshot').click()
  await expect(page.getByTestId('snapshot-count')).toHaveText('1')
  await expect(page.getByTestId('snapshot-status')).toContainText('skipped')
  expect(external).toEqual([])
})
