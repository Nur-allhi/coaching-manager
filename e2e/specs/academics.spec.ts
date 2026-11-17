import { expect, type Page, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/**
 * T-041 — Academics module. Acceptance: full CRUD with edit and soft delete for all four
 * entities; a same-room overlapping batch raises a non-blocking warning. Each test is isolated.
 */
const ACADEMICS = '/academics'

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
})

/** The status count increments only after the write commits, so specs never race a refetch. */
async function saved(page: Page, count: number) {
  await expect(page.getByTestId('academics-status')).toHaveAttribute('data-saved', String(count))
}

async function addYear(page: Page, name: string, count: number) {
  await page.getByTestId('years-name').fill(name)
  await page.getByTestId('years-startsOn').fill('2026-01-01')
  await page.getByTestId('years-endsOn').fill('2026-12-31')
  await page.getByTestId('years-save').click()
  await saved(page, count)
  await expect(page.getByTestId('years-row').filter({ hasText: name })).toBeVisible()
}

async function addClass(page: Page, name: string, count: number) {
  await page.getByTestId('classes-name').fill(name)
  await page.getByTestId('classes-save').click()
  await saved(page, count)
  await expect(page.getByTestId('classes-row').filter({ hasText: name })).toBeVisible()
}

async function fillBatch(page: Page, name: string, room: string) {
  await page.getByTestId('batches-name').fill(name)
  await page.getByTestId('batches-day-1').check()
  await page.getByTestId('batches-start').fill('09:00')
  await page.getByTestId('batches-end').fill('10:00')
  await page.getByTestId('batches-room').fill(room)
  await page.getByTestId('batches-capacity').fill('40')
  await page.getByTestId('batches-fee').fill('1000')
}

test('creates a year, class and subject and keeps them after a reload', async ({ page }) => {
  await page.goto(ACADEMICS)
  await expect(page.getByTestId('academics-screen')).toBeVisible()
  await expect(page.getByTestId('years-row')).toHaveCount(0)

  await addYear(page, '2026', 1)
  await addClass(page, 'Class 11', 2)
  await page.getByTestId('subjects-name').fill('Physics')
  await page.getByTestId('subjects-code').fill('PHY')
  await page.getByTestId('subjects-save').click()
  await saved(page, 3)
  await expect(page.getByTestId('subjects-row').filter({ hasText: 'Physics' })).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('years-row').filter({ hasText: '2026' })).toBeVisible()
  await expect(page.getByTestId('classes-row').filter({ hasText: 'Class 11' })).toBeVisible()
  await expect(page.getByTestId('subjects-row').filter({ hasText: 'Physics' })).toBeVisible()
})

test('edits a class and soft-deletes a subject', async ({ page }) => {
  await page.goto(ACADEMICS)
  await addClass(page, 'Class 9', 1)

  await page
    .getByTestId('classes-row')
    .filter({ hasText: 'Class 9' })
    .getByTestId('classes-edit')
    .click()
  await page.getByTestId('classes-name').fill('Class 10')
  await page.getByTestId('classes-save').click()
  await saved(page, 2)
  await expect(page.getByTestId('classes-row').filter({ hasText: 'Class 10' })).toBeVisible()

  await page.getByTestId('subjects-name').fill('History')
  await page.getByTestId('subjects-save').click()
  await saved(page, 3)
  const history = page.getByTestId('subjects-row').filter({ hasText: 'History' })
  await expect(history).toBeVisible()
  await history.getByTestId('subjects-delete').click()
  await saved(page, 4)
  await expect(history).toHaveCount(0)
})

test('warns on a same-room time clash but still saves the batch', async ({ page }) => {
  await page.goto(ACADEMICS)
  await addYear(page, '2026', 1)
  await addClass(page, 'Class 11', 2)

  // No explicit selectOption: the first year/class created in sibling sections must become the
  // batch form's defaults automatically (the first-use flow from a fresh database).
  await expect(page.getByTestId('batches-year')).toHaveValue(/./)
  await expect(page.getByTestId('batches-class')).toHaveValue(/./)
  await fillBatch(page, 'Morning A', 'Lab-1')
  await page.getByTestId('batches-save').click()
  await saved(page, 3)
  await expect(page.getByTestId('batches-row')).toHaveCount(1)

  await fillBatch(page, 'Morning B', 'Lab-1')
  await expect(page.getByTestId('batch-clash-warning')).toContainText('Morning A')

  await page.getByTestId('batches-save').click()
  await saved(page, 4)
  await expect(page.getByTestId('batches-row')).toHaveCount(2)
  await expect(page.getByTestId('batches-row').filter({ hasText: 'Morning B' })).toBeVisible()
})
