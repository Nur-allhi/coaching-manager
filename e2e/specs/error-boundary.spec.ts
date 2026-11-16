/**
 * T-017 — global ErrorBoundary, draft persistence and the unsaved-changes guard.
 *
 * The dev-only `/__crash-probe` route throws during render when `?crash=1`, which is a
 * deterministic way to exercise the boundary without breaking a real screen. Each test gets a
 * fresh browser context (E2E_TESTING.md §5.5), so sessionStorage starts empty and drafts cannot
 * leak between tests.
 */
import { expect, test, type Page } from '@playwright/test'
import { collectConsoleErrors } from '../helpers/console-errors'
import { collectExternalRequests } from '../helpers/network'

const PROBE_URL = '/__crash-probe'
const CRASH_URL = '/__crash-probe?crash=1'
const GUARD_MESSAGE = 'You have unsaved changes. Leave this screen?'

async function openProbe(page: Page): Promise<void> {
  await page.goto(PROBE_URL)
  await expect(page.getByRole('heading', { name: 'Error recovery test' })).toBeVisible()
}

/** The boundary's alert, scoped so a stray toast/field alert cannot cause a strict-mode match. */
function recoveryAlert(page: Page) {
  return page
    .getByRole('alert')
    .filter({ has: page.getByRole('heading', { name: 'Something went wrong' }) })
}

test.describe('global ErrorBoundary', () => {
  test('a render error shows a recoverable recovery screen instead of a blank page', async ({
    page,
  }) => {
    await page.goto(CRASH_URL)

    const alert = recoveryAlert(page)
    await expect(alert).toBeVisible()
    await expect(alert.getByRole('heading', { name: 'Something went wrong' })).toBeVisible()
    await expect(alert.getByRole('button', { name: 'Try again' })).toBeVisible()
    await expect(alert.getByRole('link', { name: 'Go to dashboard' })).toBeVisible()
    // Empty-draft path: nothing to restore, so no recovery-values section.
    await expect(
      alert.getByRole('heading', { name: 'Your unsaved values were saved' }),
    ).toHaveCount(0)
  })

  test('form values survive a boundary error and appear on the recovery screen', async ({
    page,
  }) => {
    await openProbe(page)
    const name = page.getByLabel('Name')
    await name.fill('Asha')
    await expect(name).toHaveValue('Asha')

    await page.getByRole('link', { name: 'Trigger error' }).click()

    const alert = recoveryAlert(page)
    await expect(alert).toBeVisible()
    await expect(
      alert.getByRole('heading', { name: 'Your unsaved values were saved' }),
    ).toBeVisible()
    await expect(alert).toContainText('name: Asha')
  })

  test('navigating away with unsaved changes asks for confirmation', async ({ page }) => {
    await openProbe(page)
    const name = page.getByLabel('Name')
    await name.fill('Asha')
    await expect(name).toHaveValue('Asha')

    let dialogMessage: string | undefined
    const dialogHandled = new Promise<void>((resolve) => {
      page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message()
        // Dismissing cancels the blocked navigation, so the probe stays open.
        await dialog.dismiss()
        resolve()
      })
    })

    await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
    await dialogHandled

    expect(dialogMessage).toBe(GUARD_MESSAGE)
    await expect(page).toHaveURL(/\/__crash-probe$/)
  })

  test('the only console errors on the crash page describe the intentional render error', async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page)
    await page.goto(CRASH_URL)
    await expect(recoveryAlert(page)).toBeVisible()

    // The boundary logs a diagnostic, and browsers also emit a generic line for an uncaught
    // render throw (Firefox logs a bare "Error"). Allow only those crash-related messages.
    expect(errors.length).toBeGreaterThan(0)
    const unexpected = errors.filter(
      (message) =>
        !message.includes('Unhandled render error') &&
        !message.includes('crash probe: intentional render error') &&
        !/^Error$/.test(message.trim()),
    )
    expect(unexpected).toEqual([])
  })

  test('the crash page contacts no external host', async ({ page }) => {
    const external = collectExternalRequests(page)
    await page.goto(CRASH_URL)
    await expect(recoveryAlert(page)).toBeVisible()
    expect(external).toEqual([])
  })
})
