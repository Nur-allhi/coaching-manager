/**
 * T-020 — English/Bangla toggle, independent Bangla digits, and Bengali font shaping.
 * Fresh contexts keep localStorage isolated between tests (E2E_TESTING.md §5.5).
 */
import { expect, test } from '@playwright/test'
import { collectConsoleErrors } from '../helpers/console-errors'
import { collectExternalRequests } from '../helpers/network'
import { VIEWPORTS } from '../helpers/viewports'
import { BANGLA_DIGITS_KEY, LANGUAGE_KEY } from '../helpers/locale'

const BANGLA_BUTTON = 'বাংলা'
const ENGLISH_BUTTON = 'English'
const SAMPLE_LATIN = '1,234,567'
const SAMPLE_BENGALI = '১২,৩৪,৫৬৭'

test.describe('i18n scaffold', () => {
  test('switching to Bangla translates the shell but leaves numbers in Latin digits @smoke', async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page)
    const external = collectExternalRequests(page)

    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Students', exact: true })).toBeVisible()
    await expect(page.getByTestId('sample-number')).toHaveText(SAMPLE_LATIN)

    await page.getByRole('button', { name: BANGLA_BUTTON }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'ড্যাশবোর্ড' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'শিক্ষার্থী', exact: true })).toBeVisible()
    await expect(page.getByTestId('sample-number')).toHaveText(SAMPLE_LATIN)
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn')
    expect(await page.evaluate(() => localStorage.getItem('coaching-manager:lng'))).toBe('bn')

    expect(errors).toEqual([])
    expect(external).toEqual([])
  })

  test('Bangla digits are independent of language and persist across a reload', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('switch', { name: 'Bangla digits' }).check()
    await expect(page.getByTestId('sample-number')).toHaveText(SAMPLE_BENGALI)

    await page.getByRole('button', { name: BANGLA_BUTTON }).click()
    await expect(page.getByTestId('sample-number')).toHaveText(SAMPLE_BENGALI)

    await page.reload()
    await expect(page.getByTestId('sample-number')).toHaveText(SAMPLE_BENGALI)
    expect(await page.evaluate(() => localStorage.getItem('coaching-manager:bangla-digits'))).toBe(
      'true',
    )

    await page.getByRole('switch', { name: 'বাংলা অঙ্ক' }).uncheck()
    await expect(page.getByTestId('sample-number')).toHaveText(SAMPLE_LATIN)
    await page.getByRole('button', { name: ENGLISH_BUTTON }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  })

  test('Bangla text uses the self-hosted Bengali family for correct conjunct shaping', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: BANGLA_BUTTON }).click()
    const font = await page
      .getByRole('heading', { level: 1, name: 'ড্যাশবোর্ড' })
      .evaluate((el) => getComputedStyle(el).fontFamily)
    expect(font).toContain('Noto Sans Bengali')
  })

  test('the language controls work at all three viewports with no horizontal scroll', async ({
    page,
  }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      if (viewport.width < 768) {
        await page.getByRole('button', { name: 'Open navigation menu' }).click()
      }
      const toggle = page.getByRole('button', { name: BANGLA_BUTTON })
      await expect(toggle).toBeVisible()
      await toggle.click()
      // Below 768px the sidebar is a modal Sheet: it removes the main <h1> from the
      // accessibility tree while open. Assert the translated nav link instead — it is
      // visible inside the open dialog on mobile and in the static sidebar on tablet/desktop.
      await expect(page.getByRole('link', { name: 'ড্যাশবোর্ড', exact: true })).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow, `${viewport.name} horizontal overflow`).toBe(false)
    }
  })

  test('a stored Bengali preference is applied on the next boot', async ({ page }) => {
    await page.addInitScript(
      (keys) => {
        window.localStorage.setItem(keys.language, 'bn')
        window.localStorage.setItem(keys.digits, 'false')
      },
      { language: LANGUAGE_KEY, digits: BANGLA_DIGITS_KEY },
    )
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'ড্যাশবোর্ড' })).toBeVisible()
    await expect(page.getByTestId('sample-number')).toHaveText(SAMPLE_LATIN)
  })
})
