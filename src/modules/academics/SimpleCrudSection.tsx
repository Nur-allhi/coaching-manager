/**
 * Reusable CRUD section for years, classes and subjects (T-041, D-042 D1).
 * One form, an edit action and a soft-delete action per row. The concrete `useForm` instance is
 * supplied by the screen so React Hook Form keeps its exact field types.
 */
import { useEffect, useState } from 'react'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { VersionConflictError, type Row } from '@/core/db/repository'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface SimpleField<T extends FieldValues> {
  name: Path<T>
  labelKey: string
  type?: 'text' | 'date' | 'number' | 'checkbox'
}

interface Props<T extends FieldValues> {
  testId: string
  titleKey: string
  fields: readonly SimpleField<T>[]
  defaults: T
  form: UseFormReturn<T>
  rows: readonly Row[]
  rowToForm: (row: Row) => T
  rowLabel: (row: Row) => string
  onSave: (values: T, id?: string, version?: number) => Promise<void>
  onDelete: (id: string, version: number) => Promise<void>
}

export function SimpleCrudSection<T extends FieldValues>({
  testId,
  titleKey,
  fields,
  defaults,
  form,
  rows,
  rowToForm,
  rowLabel,
  onSave,
  onDelete,
}: Props<T>) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState<Row | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    form.reset(defaults)
  }, [defaults, form])

  function startEdit(row: Row) {
    setEditing(row)
    setError('')
    form.reset(rowToForm(row))
  }

  function cancel() {
    setEditing(null)
    setError('')
    form.reset(defaults)
  }

  async function submit(values: T) {
    setError('')
    const id = editing ? String(editing.id) : undefined
    try {
      await onSave(values, id, editing ? Number(editing.version) : 1)
      form.reset(defaults)
      setEditing(null)
    } catch (error) {
      setError(
        error instanceof VersionConflictError ? t('academics.conflict') : t('academics.saveFailed'),
      )
    }
  }

  return (
    <section data-testid={`section-${testId}`} className="space-y-3">
      <h2 className="text-lg font-medium">{t(titleKey)}</h2>
      <form
        onSubmit={form.handleSubmit((values) => void submit(values))}
        className="grid gap-3 sm:grid-cols-2"
      >
        {fields.map((field) => (
          <div key={field.name} className="space-y-1">
            <Label htmlFor={`${testId}-${field.name}`}>{t(field.labelKey)}</Label>
            <Input
              id={`${testId}-${field.name}`}
              data-testid={`${testId}-${field.name}`}
              type={field.type === 'checkbox' ? 'checkbox' : (field.type ?? 'text')}
              className={field.type === 'checkbox' ? 'size-4' : undefined}
              {...form.register(field.name)}
            />
          </div>
        ))}
        <div className="flex items-end gap-2 sm:col-span-2">
          <Button type="submit" data-testid={`${testId}-save`}>
            {editing ? t('academics.update') : t('academics.add')}
          </Button>
          {editing && (
            <Button type="button" variant="outline" onClick={cancel}>
              {t('academics.cancel')}
            </Button>
          )}
        </div>
      </form>
      <p data-testid={`${testId}-error`} role="alert" className="text-destructive text-sm">
        {error}
      </p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('academics.empty')}</p>
      ) : (
        <ul className="divide-y text-sm">
          {rows.map((row) => (
            <li
              key={String(row.id)}
              data-testid={`${testId}-row`}
              data-name={rowLabel(row)}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span>{rowLabel(row)}</span>
              <span className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid={`${testId}-edit`}
                  onClick={() => startEdit(row)}
                >
                  {t('academics.edit')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  data-testid={`${testId}-delete`}
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
    </section>
  )
}
