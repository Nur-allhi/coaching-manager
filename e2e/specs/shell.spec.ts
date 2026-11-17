import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/** The sidebar order from FRONTEND_SPEC.md §3.3, asserted against what actually renders. */
const navigation = [
  { label: 'Dashboard', path: '/' },
  { label: 'Students', path: '/students' },
  { label: 'Academics', path: '/academics' },
  { label: 'Enrollments', path: '/enrollments' },
  { label: 'Payments', path: '/payments' },
  { label: 'Attendance', path: '/attendance' },
  { label: 'Exams', path: '/exams' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'Reports', path: '/reports' },
  { label: 'Data tools', path: '/data-tools', heading: 'Backups' },
  { label: 'Settings', path: '/settings' },
]

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
})

test.describe('app shell navigation', () => {
  for (const item of navigation) {
    test(`the ${item.label} entry renders its screen`, async ({ page }) => {
      await page.goto('/')
      await page.getByRole('link', { name: item.label, exact: true }).click()
      await expect(
        page.getByRole('heading', { level: 1, name: item.heading ?? item.label }),
      ).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`${item.path === '/' ? '/$' : item.path}$`))
    })
  }

  test('every route renders directly by URL @smoke', async ({ page }) => {
    for (const item of navigation) {
      await page.goto(item.path)
      await expect(
        page.getByRole('heading', { level: 1, name: item.heading ?? item.label }),
      ).toBeVisible()
    }
  })
})
