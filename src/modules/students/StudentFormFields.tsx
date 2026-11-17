/** Shared admission/edit form fields (T-042). React Hook Form + Zod; every input has a label. */
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StudentForm } from './types'

const FIELDS = [
  ['phone', 'students.phone'],
  ['guardianName', 'students.guardianName'],
  ['guardianPhone', 'students.guardianPhone'],
  ['address', 'students.address'],
  ['schoolName', 'students.schoolName'],
  ['notes', 'students.notes'],
] as const

interface Props {
  form: UseFormReturn<StudentForm>
  admittedOn: string
}

export function StudentFormFields({ form, admittedOn }: Props) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="student-name">{t('students.fullName')}</Label>
        <Input id="student-name" data-testid="student-name" {...form.register('fullName')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="student-gender">{t('students.gender')}</Label>
        <select
          id="student-gender"
          data-testid="student-gender"
          className="border-input h-9 w-full rounded-md border px-2 text-sm"
          {...form.register('gender')}
        >
          <option value="">{t('students.unspecified')}</option>
          <option value="male">{t('students.male')}</option>
          <option value="female">{t('students.female')}</option>
          <option value="other">{t('students.other')}</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="student-dob">{t('students.dob')}</Label>
        <Input id="student-dob" data-testid="student-dob" type="date" {...form.register('dob')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="student-admitted">{t('students.admittedOn')}</Label>
        <Input
          id="student-admitted"
          data-testid="student-admitted"
          type="date"
          defaultValue={admittedOn}
          {...form.register('admittedOn')}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="student-status">{t('students.status')}</Label>
        <select
          id="student-status"
          data-testid="student-status"
          className="border-input h-9 w-full rounded-md border px-2 text-sm"
          {...form.register('status')}
        >
          <option value="active">{t('students.active')}</option>
          <option value="dropped">{t('students.dropped')}</option>
          <option value="passed_out">{t('students.passedOut')}</option>
        </select>
      </div>
      {FIELDS.map(([name, labelKey]) => (
        <div key={name} className="space-y-1">
          <Label htmlFor={`student-${name}`}>{t(labelKey)}</Label>
          <Input id={`student-${name}`} data-testid={`student-${name}`} {...form.register(name)} />
        </div>
      ))}
    </div>
  )
}
