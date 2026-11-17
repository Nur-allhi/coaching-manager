import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/**
 * T-040 — Settings module. Acceptance: every setting persists across reload, grading scale is
 * editable with the correct default, backup/storage status shown. Each test gets a fresh context.
 */
const SETTINGS = '/settings'

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
})

test('changing the centre name survives a reload', async ({ page }) => {
  await page.goto(SETTINGS)
  const name = page.getByTestId('centre-name')
  await expect(name).toHaveValue('Coaching Manager')

  await name.fill('Sunrise Coaching Centre')
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-status')).toHaveText('saved', { timeout: 10_000 })

  await page.reload()
  await expect(page.getByTestId('centre-name')).toHaveValue('Sunrise Coaching Centre')
})

test('the grading scale shows the documented default and is editable', async ({ page }) => {
  await page.goto(SETTINGS)
  await expect(page.getByRole('spinbutton', { name: 'Min A+' })).toHaveValue('80')
  await expect(page.getByRole('spinbutton', { name: 'Points A-' })).toHaveValue('3.5')
  await expect(page.getByRole('spinbutton', { name: 'Max F' })).toHaveValue('32')

  await page.getByRole('spinbutton', { name: 'Min A+' }).fill('85')
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-status')).toHaveText('saved', { timeout: 10_000 })

  await page.reload()
  await expect(page.getByRole('spinbutton', { name: 'Min A+' })).toHaveValue('85')
})

test('the screen shows backup and storage status', async ({ page }) => {
  await page.goto(SETTINGS)
  await expect(page.getByRole('heading', { name: 'Backup status' })).toBeVisible()
  await expect(page.getByText(/Snapshots:/)).toBeVisible()
  await expect(page.getByText(/Persistent storage:/)).toBeVisible()
})

test('shows the version stamped from package.json', async ({ page }) => {
  const version = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    .version as string
  await page.goto(SETTINGS)
  await expect(page.getByTestId('app-version')).toHaveText(`Version: ${version}`)
})
