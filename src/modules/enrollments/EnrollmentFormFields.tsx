/** Enrollment form fields (T-043). Kept separate so the screen stays under 300 LOC. */
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Row } from '@/core/db/repository'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { EnrollmentForm } from './types'

const TEXT_FIELDS = [
  ['enrolledOn', 'enrollments.enrolledOn', 'date', 'enroll-date'],
  ['leftOn', 'enrollments.leftOn', 'date', 'enroll-left'],
  ['admissionFee', 'enrollments.admissionFee', 'numeric', 'enroll-admission'],
  ['monthlyFee', 'enrollments.monthlyFee', 'numeric', 'enroll-monthly'],
  ['discountValue', 'enrollments.discountValue', 'numeric', 'enroll-discount'],
] as const

interface Props {
  form: UseFormReturn<EnrollmentForm>
  students: readonly Row[]
  batches: readonly Row[]
  editing: boolean
  onCancel: () => void
}

export function EnrollmentFormFields({ form, students, batches, editing, onCancel }: Props) {
  const { t } = useTranslation()
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="enroll-student">{t('enrollments.student')}</Label>
        <select
          id="enroll-student"
          data-testid="enroll-student"
          className="border-input h-9 w-full rounded-md border px-2 text-sm"
          {...form.register('studentId')}
        >
          <option value="">{t('enrollments.selectPlaceholder')}</option>
          {students.map((student) => (
            <option key={String(student.id)} value={String(student.id)}>
              {String(student.full_name)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="enroll-batch">{t('enrollments.batch')}</Label>
        <select
          id="enroll-batch"
          data-testid="enroll-batch"
          className="border-input h-9 w-full rounded-md border px-2 text-sm"
          {...form.register('batchId')}
        >
          <option value="">{t('enrollments.selectPlaceholder')}</option>
          {batches.map((batch) => (
            <option key={String(batch.id)} value={String(batch.id)}>
              {String(batch.name)}
            </option>
          ))}
        </select>
      </div>
      {TEXT_FIELDS.map(([name, labelKey, mode, testId]) => (
        <div key={name} className="space-y-1">
          <Label htmlFor={testId}>{t(labelKey)}</Label>
          <Input
            id={testId}
            data-testid={testId}
            {...(mode === 'date' ? { type: 'date' as const } : { inputMode: mode })}
            {...form.register(name)}
          />
        </div>
      ))}
      <div className="space-y-1">
        <Label htmlFor="enroll-kind">{t('enrollments.discountKind')}</Label>
        <select
          id="enroll-kind"
          data-testid="enroll-kind"
          className="border-input h-9 w-full rounded-md border px-2 text-sm"
          {...form.register('discountKind')}
        >
          <option value="none">{t('enrollments.none')}</option>
          <option value="fixed">{t('enrollments.fixed')}</option>
          <option value="percent">{t('enrollments.percent')}</option>
        </select>
      </div>
      <div className="flex items-end gap-2 sm:col-span-2">
        <Button type="submit" data-testid="enroll-save">
          {editing ? t('enrollments.transfer') : t('enrollments.enroll')}
        </Button>
        {editing && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('enrollments.cancel')}
          </Button>
        )}
      </div>
    </>
  )
}
