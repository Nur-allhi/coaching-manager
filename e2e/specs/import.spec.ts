import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/**
 * T-081 — upload a CSV through the real /data-tools/import screen: a bad row is flagged before
 * anything is written, a dry run is read-only, and a second identical import creates no duplicate.
 */
const HEADER = 'student_no,full_name,admitted_on,status,phone,guardian_name'

function file(rows: string[]) {
  return {
    name: 'students.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from([HEADER, ...rows].join('\r\n')),
  }
}

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
  await page.goto('/data-tools/import')
})

test('flags a bad row and writes nothing on a dry run', async ({ page }) => {
  await page
    .getByTestId('import-file')
    .setInputFiles(
      file([
        '2026-0001,Rahim,2026-01-10,active,01700000001,Karim',
        '2026-0002,Corrupt,10-01-2026,active,01700000002,Karim',
      ]),
    )

  await expect(page.getByTestId('import-summary')).toHaveText('1 valid rows, 1 rows with errors')
  await expect(page.getByTestId('import-row-errors-3')).toContainText('Date must be YYYY-MM-DD')
  await page.getByTestId('import-dry-run').click()
  await expect(page.getByTestId('import-status')).toHaveText('Preview only — nothing was written.')

  await page.goto('/students')
  await expect(page.getByTestId('students-count')).toContainText('0')
})

test('imports valid rows and does not duplicate them on a second import', async ({ page }) => {
  await page
    .getByTestId('import-file')
    .setInputFiles(
      file([
        '2026-0001,Rahim,2026-01-10,active,01700000001,Karim',
        '2026-0002,Karim,2026-01-11,active,01700000002,Rahim',
      ]),
    )
  await page.getByTestId('import-commit').click()
  await expect(page.getByTestId('import-status')).toContainText('Imported 2 rows')

  await page.goto('/students')
  await expect(page.getByTestId('students-count')).toContainText('2')

  await page.goto('/data-tools/import')
  await page
    .getByTestId('import-file')
    .setInputFiles(
      file([
        '2026-0001,Rahim,2026-01-10,active,01700000001,Karim',
        '2026-0002,Karim,2026-01-11,active,01700000002,Rahim',
      ]),
    )
  await expect(page.getByTestId('import-summary')).toHaveText('0 valid rows, 2 rows with errors')
  await expect(page.getByTestId('import-row-errors-2')).toContainText('Duplicate row')
  await expect(page.getByTestId('import-commit')).toBeDisabled()
})
