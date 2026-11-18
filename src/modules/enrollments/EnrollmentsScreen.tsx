/**
 * Enrollments screen (T-043). List active/closed enrollments, enroll a student into a batch,
 * transfer between batches (old row stays in history) and see the non-blocking capacity warning.
 */
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { listBatches } from '@/modules/academics'
import { listStudents } from '@/modules/students'
import { getDb } from '@/core/db/client'
import { VersionConflictError } from '@/core/db/repository'
import { today } from '@/core/dates/dates'
import { formatMinor } from '@/core/money/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOptimisticMutation } from '@/core/ui/use-optimistic-mutation'
import { EnrollmentFormFields } from './EnrollmentFormFields'
import {
  capacityWarningFor,
  discountedMonthlyFee,
  enroll,
  feeDefaultsForBatch,
  listEnrollments,
  setLeaveDate,
  transfer,
} from './service'
import { enrollmentForm, formFromRow, type EnrollmentForm, type EnrollmentRow } from './types'

const KEY = ['enrollments'] as const
type Command = {
  kind: 'enroll' | 'transfer'
  values: EnrollmentForm
  oldId?: string
  version?: number
}

export function EnrollmentsScreen() {
  const { t } = useTranslation()
  const db = getDb()
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<EnrollmentRow | null>(null)
  const [capacity, setCapacity] = useState(false)
  const form = useForm<EnrollmentForm>({
    resolver: zodResolver(enrollmentForm),
    defaultValues: {
      studentId: '',
      batchId: '',
      enrolledOn: today(),
      leftOn: '',
      admissionFee: '0',
      monthlyFee: '0',
      discountKind: 'none',
      discountValue: '0',
    },
  })

  const list = useQuery({ queryKey: KEY, queryFn: () => listEnrollments(db) })
  const students = useQuery({ queryKey: ['students', 'all'], queryFn: () => listStudents(db) })
  const batches = useQuery({ queryKey: ['academics', 'batches'], queryFn: () => listBatches(db) })
  const batchId = useWatch({ control: form.control, name: 'batchId' })
  const monthlyFee = useWatch({ control: form.control, name: 'monthlyFee' })
  const discountKind = useWatch({ control: form.control, name: 'discountKind' })
  const discountValue = useWatch({ control: form.control, name: 'discountValue' })

  useEffect(() => {
    let active = true
    void feeDefaultsForBatch(db, batchId || '__none__').then((defaults) => {
      if (active && !editing && batchId) {
        form.setValue('monthlyFee', defaults.monthlyFee)
        form.setValue('admissionFee', defaults.admissionFee)
      }
    })
    void capacityWarningFor(db, batchId || '__none__').then((value) => {
      if (active) setCapacity(value)
    })
    return () => {
      active = false
    }
  }, [db, batchId, editing, form])

  const mutation = useOptimisticMutation<EnrollmentRow[], Command>({
    mutationFn: async (command) => {
      if (command.kind === 'transfer' && command.oldId && command.version) {
        await transfer(db, command.oldId, command.version, command.values)
      } else {
        await enroll(db, command.values)
      }
    },
    queryKey: KEY,
    patch: (rows) => rows ?? [],
  })

  async function submit(values: EnrollmentForm) {
    setError('')
    try {
      await mutation({
        kind: editing ? 'transfer' : 'enroll',
        values,
        oldId: editing ? String(editing.id) : undefined,
        version: editing ? Number(editing.version) : undefined,
      })
      form.reset({
        studentId: '',
        batchId: '',
        enrolledOn: today(),
        leftOn: '',
        admissionFee: '0',
        monthlyFee: '0',
        discountKind: 'none',
        discountValue: '0',
      })
      setEditing(null)
    } catch (cause) {
      setError(
        cause instanceof VersionConflictError
          ? t('enrollments.conflict')
          : t('enrollments.saveFailed'),
      )
    }
  }

  function startEdit(row: EnrollmentRow) {
    setEditing(row)
    form.reset(formFromRow(row))
  }

  const net = discountedMonthlyFee(
    Number(monthlyFee || '0'),
    discountKind,
    Number(discountValue || '0'),
  )

  return (
    <div
      data-testid="enrollments-screen"
      className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"
    >
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.enrollments')}</h1>
      <p data-testid="enrollments-status" role="status" className="text-muted-foreground text-sm">
        {t('enrollments.count')}: {(list.data ?? []).length}
      </p>

      <form
        onSubmit={form.handleSubmit((values) => void submit(values))}
        className="grid gap-3 sm:grid-cols-2"
      >
        <EnrollmentFormFields
          form={form}
          students={students.data ?? []}
          batches={batches.data ?? []}
          editing={editing !== null}
          onCancel={() => setEditing(null)}
        />
      </form>

      <p data-testid="enroll-net" className="text-sm">
        {t('enrollments.netMonthly')}: {formatMinor(net)}{' '}
        <span className="text-muted-foreground text-xs">{t('enrollments.bdt')}</span>
      </p>
      {capacity && (
        <p data-testid="enroll-capacity-warning" role="status" className="text-warning text-sm">
          {t('enrollments.capacityWarning')}
        </p>
      )}
      <p data-testid="enroll-error" role="alert" className="text-destructive text-sm">
        {error}
      </p>

      {(list.data ?? []).length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('enrollments.empty')}</p>
      ) : (
        <ul className="divide-y text-sm">
          {(list.data ?? []).map((row) => (
            <li
              key={String(row.id)}
              data-testid="enroll-row"
              className="flex items-center justify-between gap-3 py-2"
            >
              <span>
                {row.student_id} → {row.batch_id} · {t(`enrollments.${row.status}`)} ·{' '}
                {t('enrollments.netMonthly')}:{' '}
                {formatMinor(
                  discountedMonthlyFee(
                    row.monthly_fee_minor,
                    row.discount_kind,
                    row.discount_value,
                  ),
                )}
              </span>
              <span className="flex gap-2">
                {row.status === 'active' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid="enroll-transfer"
                    onClick={() => startEdit(row)}
                  >
                    {t('enrollments.transfer')}
                  </Button>
                )}
                <Input
                  type="date"
                  aria-label={t('enrollments.leftOn')}
                  data-testid="enroll-leave"
                  className="w-36"
                  onChange={(event) =>
                    void setLeaveDate(db, String(row.id), Number(row.version), event.target.value)
                      .then(() => list.refetch())
                      .catch((cause) => {
                        setError(
                          cause instanceof VersionConflictError
                            ? t('enrollments.conflict')
                            : t('enrollments.saveFailed'),
                        )
                        void list.refetch() // restore the displayed date from the database
                      })
                  }
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
