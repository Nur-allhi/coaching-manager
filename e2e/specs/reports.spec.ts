import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/** T-071 — reports framework. Seed students, filter the report and verify preview vs export. */

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
  await page.goto('/__dashboard-fixture')
  await page.getByTestId('fixture-seed').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
  await page.goto('/reports')
  // The fixture has three students admitted in the current month and one from 2020.
  await page.getByTestId('report-from').fill('2021-01-01')
  await page.getByTestId('report-to').fill('2100-12-31')
})

test('the preview shows exactly the filtered rows', async ({ page }) => {
  await expect(page.getByTestId('report-row')).toHaveCount(3)
  await expect(page.getByTestId('report-row-count')).toHaveText('3')
  const preview = await page.getByTestId('report-row').allTextContents()
  expect(preview.some((text) => text.includes('Rahim'))).toBe(true)
  expect(preview.some((text) => text.includes('Karim'))).toBe(true)
  expect(preview.some((text) => text.includes('Asha'))).toBe(true)
  expect(preview.some((text) => text.includes('Old Student'))).toBe(false)
})

test('the exported CSV is the preview with a UTF-8 BOM', async ({ page }) => {
  await expect(page.getByTestId('report-row')).toHaveCount(3)
  const download = page.waitForEvent('download')
  await page.getByTestId('report-export-csv').click()
  const file = await download
  expect(file.suggestedFilename()).toBe('students.csv')
  const content = await readFile((await file.path()) ?? '', 'utf8')
  expect(content.charCodeAt(0)).toBe(0xfeff)
  const lines = content.trim().split('\r\n')
  expect(lines).toHaveLength(4)
  expect(content).toContain('"Student no","Student"')
  expect(content).toContain('"Rahim"')
  expect(content).toContain('"Karim"')
  expect(content).toContain('"Asha"')
})

test('the Excel export downloads a workbook with no console errors or phone overflow', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await expect(page.getByTestId('report-row')).toHaveCount(3)
  const download = page.waitForEvent('download')
  await page.getByTestId('report-export-excel').click()
  const file = await download
  expect(file.suggestedFilename()).toBe('students.xlsx')

  await page.setViewportSize({ width: 375, height: 800 })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})

test('every catalogue report is selectable and its total matches the module sums', async ({
  page,
}) => {
  await page.getByTestId('report-select').selectOption('admissions')
  await expect(page.getByTestId('report-row')).toHaveCount(3)
  await expect(page.getByTestId('report-total')).toHaveText('3')

  await page.getByTestId('report-select').selectOption('payments')
  await expect(page.getByTestId('report-row')).toHaveCount(1)
  await expect(page.getByTestId('report-total')).toHaveText('400')

  await page.getByTestId('report-select').selectOption('dues')
  await expect(page.getByTestId('report-row')).toHaveCount(4)
  await expect(page.getByTestId('report-total')).toHaveText('3,600')

  await page.getByTestId('report-select').selectOption('attendance')
  await expect(page.getByTestId('report-row')).toHaveCount(3)
  await expect(page.getByTestId('report-total')).toHaveText('66.7%')

  await page.getByTestId('report-select').selectOption('results')
  await expect(page.getByTestId('report-row')).toHaveCount(2)
  await expect(page.getByTestId('report-total')).toHaveText('85')
})
