import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/** T-054 — the A5 receipt print route and the Excel download, driven from real payments. */
let paymentId = ''

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
  await page.goto('/__payment-fixture')
  await page.getByTestId('fixture-seed').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
  await page.goto('/payments')
  await page.getByTestId('pay-student').selectOption({ label: 'Fixture Student' })
  await page.getByTestId('pay-date').fill('2026-02-10')
  await page.getByTestId('pay-amount').fill('20')
  await page.getByTestId('payment-save').click()
  await expect(page.getByTestId('payment-receipt')).toContainText('R-2026-000001')
  paymentId = (await page.getByTestId('payment-row').first().getAttribute('data-payment-id')) ?? ''
  expect(paymentId).not.toBe('')
})

test('the print route shows every required field, a QR and the Bangla font', async ({ page }) => {
  await page.goto(`/print/receipt/${paymentId}`)
  await expect(page.getByTestId('receipt-page')).toBeVisible()
  await expect(page.getByTestId('receipt-no')).toContainText('R-2026-000001')
  await expect(page.getByTestId('receipt-date')).toContainText('2026-02-10')
  await expect(page.getByTestId('receipt-student')).toContainText('Fixture Student')
  await expect(page.getByTestId('receipt-student-no')).toContainText('2026-0001')
  await expect(page.getByTestId('receipt-batch')).toContainText('A')
  await expect(page.getByTestId('receipt-months')).toContainText('Admission fee')
  await expect(page.getByTestId('receipt-amount')).toContainText('20')
  await expect(page.getByTestId('receipt-method')).toContainText('Cash')
  await expect(page.getByTestId('receipt-balance')).toContainText('40')
  await expect(page.getByTestId('receipt-signature')).toBeVisible()
  await expect(page.getByTestId('receipt-print')).toBeVisible()

  await expect(page.getByTestId('receipt-qr').locator('img')).toHaveAttribute(
    'src',
    /^data:image\/png/,
  )
  const font = await page
    .getByTestId('receipt-centre-bn')
    .evaluate((el) => getComputedStyle(el).fontFamily)
  expect(font).toContain('Noto Sans Bengali')
  await expect(page.getByTestId('receipt-centre-bn')).toHaveAttribute('lang', 'bn')
})

test('a void receipt shows VOID and a reprint shows DUPLICATE', async ({ page }) => {
  await page.goto('/payments')
  await page.getByTestId('payment-void').click()
  await expect(page.getByTestId('row-marker')).toHaveText('VOID')

  await page.goto(`/print/receipt/${paymentId}`)
  await expect(page.getByTestId('receipt-watermark')).toHaveText('VOID')
  await page.goto(`/print/receipt/${paymentId}?duplicate=1`)
  await expect(page.getByTestId('receipt-watermark')).toHaveText('VOID')
})

test('an edited receipt shows REVISED with its revision count', async ({ page }) => {
  await page.goto('/payments')
  await page.getByTestId('payment-edit').click()
  await page.getByTestId('edit-amount').fill('30')
  await page.getByTestId('edit-save').click()
  await expect(page.getByTestId('row-marker')).toHaveText('REVISED 1')

  await page.goto(`/print/receipt/${paymentId}`)
  await expect(page.getByTestId('receipt-watermark')).toHaveText('REVISED 1')
})

test('the Excel export downloads a workbook', async ({ page }) => {
  await page.goto('/payments')
  const download = page.waitForEvent('download')
  await page.getByTestId('receipt-export').click()
  const file = await download
  expect(file.suggestedFilename()).toBe('receipts.xlsx')
})
