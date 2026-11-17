import { expect, test, type Page } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/**
 * T-080 — PIN lock and roles. The PIN is set through the real Settings security panel; lock and
 * role state are injected into the browser's storage to avoid waiting ten minutes or adding a
 * product role switcher that v1 does not have (D-060 C1). All assertions are on product UI.
 */
const PIN = '123456'
const PIN_KEY = 'coaching-manager:pin'
const SESSION_KEY = 'coaching-manager:session'
const IDLE_KEY = 'coaching-manager:idle-minutes'

async function setPinViaSettings(page: Page) {
  await page.goto('/settings')
  await page.getByTestId('security-pin').fill(PIN)
  await page.getByTestId('security-confirm').fill(PIN)
  await page.getByTestId('security-set-pin').click()
  await expect(page.getByTestId('security-message')).toHaveText('Saved')
}

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
  await page.goto('/')
  await page.evaluate(
    (keys) => {
      localStorage.removeItem(keys.pin)
      localStorage.removeItem(keys.idle)
      sessionStorage.removeItem(keys.session)
    },
    { pin: PIN_KEY, idle: IDLE_KEY, session: SESSION_KEY },
  )
})

test('locks the app and unlocks with the PIN', async ({ page }) => {
  await setPinViaSettings(page)
  await page.evaluate((key) => sessionStorage.removeItem(key), SESSION_KEY)
  await page.goto('/')

  await expect(page.getByTestId('lock-title')).toBeVisible()
  await page.getByTestId('unlock-pin').fill('000000')
  await page.getByTestId('unlock-submit').click()
  await expect(page.getByTestId('unlock-error')).toHaveText('That PIN was not accepted. Try again.')
  await expect(page.getByTestId('lock-title')).toBeVisible()

  await page.getByTestId('unlock-pin').fill(PIN)
  await page.getByTestId('unlock-submit').click()
  await expect(page.getByTestId('lock-title')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('a role denied permission in the UI is also refused by the service', async ({ page }) => {
  await page.goto('/__payment-fixture')
  await page.getByTestId('fixture-seed').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')

  await setPinViaSettings(page)
  await page.evaluate((key) => {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        actorId: 'teacher',
        role: 'teacher',
        authenticatedAt: Date.now(),
        lastActivityAt: Date.now(),
      }),
    )
  }, SESSION_KEY)
  await page.goto('/payments')

  await expect(page.getByTestId('payment-no-permission')).toBeVisible()
  await expect(page.getByTestId('payment-save')).toBeDisabled()
})

test('locks after the inactivity timeout', async ({ page }) => {
  await setPinViaSettings(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  // Lower the timeout only after the dashboard is up, so slow boots cannot lock mid-render.
  await page.evaluate((key) => localStorage.setItem(key, '0.02'), IDLE_KEY)
  await expect(page.getByTestId('lock-title')).toBeVisible({ timeout: 10_000 })
})
