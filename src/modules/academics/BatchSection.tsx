/**
 * Batch form and list (T-041, D-042). Non-blocking clash and capacity warnings are computed from
 * the current form values on every change; neither prevents the save.
 */
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getDb } from '@/core/db/client'
import { VersionConflictError, type Row } from '@/core/db/repository'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { capacityWarning, findBatchClashes, toBatchPatch } from './service'
import { batchForm, maskToDays, type BatchForm } from './types'

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

interface Props {
  years: readonly Row[]
  classes: readonly Row[]
  rows: readonly Row[]
  onSave: (values: BatchForm, id?: string, version?: number) => Promise<void>
  onDelete: (id: string, version: number) => Promise<void>
}

function emptyForm(years: readonly Row[], classes: readonly Row[]): BatchForm {
  return {
    academicYearId: years[0] ? String(years[0].id) : '',
    classId: classes[0] ? String(classes[0].id) : '',
    name: '',
    days: [false, false, false, false, false, false, false],
    startTime: '09:00',
    endTime: '10:00',
    room: '',
    capacity: '',
    monthlyFee: '1000',
  }
}

function rowToForm(row: Row): BatchForm {
  return {
    academicYearId: String(row.academic_year_id),
    classId: String(row.class_id),
    name: String(row.name),
    days: maskToDays(Number(row.days_mask)),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    room: row.room === null ? '' : String(row.room),
    capacity: row.capacity === null ? '' : String(row.capacity),
    monthlyFee: (Number(row.monthly_fee_minor) / 100).toFixed(2),
  }
}

export function BatchSection({ years, classes, rows, onSave, onDelete }: Props) {
  const { t } = useTranslation()
  const db = getDb()
  const [editing, setEditing] = useState<Row | null>(null)
  const [error, setError] = useState('')
  const defaults = emptyForm(years, classes)
  const form = useForm<BatchForm>({ resolver: zodResolver(batchForm), defaultValues: defaults })
  const values = useWatch({ control: form.control })

  // The option lists arrive after the first render on a fresh database. RHF does not adopt new
  // defaultValues, so re-seed the two selects when they appear and no edit is in progress.
  useEffect(() => {
    if (!editing) {
      form.setValue('academicYearId', years[0] ? String(years[0].id) : '')
      form.setValue('classId', classes[0] ? String(classes[0].id) : '')
    }
  }, [years, classes, editing, form])

  let patch: Row | null = null
  try {
    patch = toBatchPatch(values as BatchForm)
  } catch {
    // An incomplete form has no meaningful warnings yet.
  }

  const clashes = useQuery({
    queryKey: [
      'academics',
      'clashes',
      patch?.room ?? '',
      patch?.days_mask ?? 0,
      patch?.start_time ?? '',
      patch?.end_time ?? '',
      editing?.id ?? '',
    ],
    queryFn: () =>
      patch
        ? findBatchClashes(db, patch, editing ? String(editing.id) : undefined)
        : Promise.resolve([]),
  })

  const overCapacity = capacityWarning(
    patch && patch.capacity === null ? null : Number(patch?.capacity),
    0, // No enrollments module yet (T-043); the pure helper is unit-tested with real occupancy.
  )

  async function submit(input: BatchForm) {
    setError('')
    try {
      await onSave(
        input,
        editing ? String(editing.id) : undefined,
        editing ? Number(editing.version) : 1,
      )
      form.reset(defaults)
      setEditing(null)
    } catch (error) {
      setError(
        error instanceof VersionConflictError ? t('academics.conflict') : t('academics.saveFailed'),
      )
    }
  }

  function startEdit(row: Row) {
    setEditing(row)
    setError('')
    form.reset(rowToForm(row))
  }

  return (
    <section data-testid="section-batches" className="space-y-3">
      <h2 className="text-lg font-medium">{t('academics.batches')}</h2>
      <form
        onSubmit={form.handleSubmit((input) => void submit(input))}
        className="grid gap-3 sm:grid-cols-2"
      >
        <div className="space-y-1">
          <Label htmlFor="batches-year">{t('academics.year')}</Label>
          <select
            id="batches-year"
            data-testid="batches-year"
            className="border-input h-9 w-full rounded-md border px-2 text-sm"
            {...form.register('academicYearId')}
          >
            {years.map((year) => (
              <option key={String(year.id)} value={String(year.id)}>
                {String(year.name)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="batches-class">{t('academics.class')}</Label>
          <select
            id="batches-class"
            data-testid="batches-class"
            className="border-input h-9 w-full rounded-md border px-2 text-sm"
            {...form.register('classId')}
          >
            {classes.map((klass) => (
              <option key={String(klass.id)} value={String(klass.id)}>
                {String(klass.name)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="batches-name">{t('academics.name')}</Label>
          <Input id="batches-name" data-testid="batches-name" {...form.register('name')} />
        </div>
        <fieldset className="space-y-1 sm:col-span-2">
          <legend className="text-sm font-medium">{t('academics.days')}</legend>
          <div className="flex flex-wrap gap-3">
            {DAY_KEYS.map((key, index) => (
              <Label
                key={key}
                htmlFor={`batches-day-${index}`}
                className="flex items-center gap-1 text-sm font-normal"
              >
                <Input
                  id={`batches-day-${index}`}
                  data-testid={`batches-day-${index}`}
                  type="checkbox"
                  className="size-4"
                  {...form.register(`days.${index}` as const)}
                />
                {t(`academics.day.${key}`)}
              </Label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1">
          <Label htmlFor="batches-start">{t('academics.startTime')}</Label>
          <Input
            id="batches-start"
            data-testid="batches-start"
            type="time"
            {...form.register('startTime')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="batches-end">{t('academics.endTime')}</Label>
          <Input
            id="batches-end"
            data-testid="batches-end"
            type="time"
            {...form.register('endTime')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="batches-room">{t('academics.room')}</Label>
          <Input id="batches-room" data-testid="batches-room" {...form.register('room')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="batches-capacity">{t('academics.capacity')}</Label>
          <Input
            id="batches-capacity"
            data-testid="batches-capacity"
            inputMode="numeric"
            {...form.register('capacity')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="batches-fee">{t('academics.monthlyFee')}</Label>
          <Input
            id="batches-fee"
            data-testid="batches-fee"
            inputMode="decimal"
            {...form.register('monthlyFee')}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" data-testid="batches-save">
            {editing ? t('academics.update') : t('academics.add')}
          </Button>
          {editing && (
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              {t('academics.cancel')}
            </Button>
          )}
        </div>
      </form>

      {(clashes.data?.length ?? 0) > 0 && (
        <p data-testid="batch-clash-warning" role="status" className="text-warning text-sm">
          {t('academics.clashWarning')}: {clashes.data?.join(', ')}
        </p>
      )}
      {overCapacity && (
        <p data-testid="batch-capacity-warning" role="status" className="text-warning text-sm">
          {t('academics.capacityWarning')}
        </p>
      )}
      <p data-testid="batches-error" role="alert" className="text-destructive text-sm">
        {error}
      </p>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('academics.empty')}</p>
      ) : (
        <ul className="divide-y text-sm">
          {rows.map((row) => (
            <li
              key={String(row.id)}
              data-testid="batches-row"
              data-name={String(row.name)}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span>{String(row.name)}</span>
              <span className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="batches-edit"
                  onClick={() => startEdit(row)}
                >
                  {t('academics.edit')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  data-testid="batches-delete"
                  onClick={() =>
                    void onDelete(String(row.id), Number(row.version)).catch(() =>
                      setError(t('academics.deleteFailed')),
                    )
                  }
                >
                  {t('academics.delete')}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted-foreground text-sm">
        {t('academics.batchesCount')}: {rows.length}
      </p>
    </section>
  )
}
