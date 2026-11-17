import { expect, test } from '@playwright/test'
import { collectExternalRequests } from '../helpers/network'
import { useEnglish } from '../helpers/locale'

/** T-091 — the guide is in the sidebar, has both language tabs, and needs no network. */
test.beforeEach(async ({ page }) => {
  await useEnglish(page)
})

test('opens from the sidebar and shows both language tabs', async ({ page }) => {
  const external = collectExternalRequests(page)
  await page.goto('/')
  await page.getByTestId('guide-link').click()
  await expect(page).toHaveURL('/guide')
  await expect(page.getByRole('heading', { name: 'User guide' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'English' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'বাংলা' })).toBeVisible()

  await expect(page.getByTestId('guide-step-admission')).toContainText('Admit a student')
  await page.getByTestId('guide-tab-bn').click()
  await expect(page.getByTestId('guide-step-admission')).toContainText('শিক্ষার্থী ভর্তি')
  expect(external, 'external requests').toEqual([])
})
