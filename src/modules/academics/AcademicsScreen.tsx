/**
 * Academics screen (T-041, D-042 D1). One lazy route with four CRUD sections. Every write goes
 * through the shared optimistic mutation helper; the database is the source of truth after settle.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { getDb } from '@/core/db/client'
import type { Row } from '@/core/db/repository'
import { useOptimisticMutation } from '@/core/ui/use-optimistic-mutation'
import { Button } from '@/components/ui/button'
import { BatchSection } from './BatchSection'
import { SimpleCrudSection } from './SimpleCrudSection'
import {
  executeDelete,
  executeSave,
  getAll,
  previewRow,
  type AcademicsData,
  type DeleteCommand,
  type SaveCommand,
} from './service'
import {
  classForm,
  subjectForm,
  yearForm,
  type ClassForm,
  type Kind,
  type SubjectForm,
  type YearForm,
} from './types'

const KEY = ['academics'] as const
const EMPTY: AcademicsData = { years: [], classes: [], subjects: [], batches: [] }
const YEAR_DEFAULTS: YearForm = { name: '', startsOn: '', endsOn: '', isCurrent: false }
const CLASS_DEFAULTS: ClassForm = { name: '', sortOrder: '0' }
const SUBJECT_DEFAULTS: SubjectForm = { name: '', code: '' }

type Command = { type: 'save'; command: SaveCommand } | { type: 'delete'; command: DeleteCommand }

function replaceList(
  data: AcademicsData,
  kind: Kind,
  change: (rows: Row[]) => Row[],
): AcademicsData {
  switch (kind) {
    case 'years':
      return { ...data, years: change(data.years) }
    case 'classes':
      return { ...data, classes: change(data.classes) }
    case 'subjects':
      return { ...data, subjects: change(data.subjects) }
    case 'batches':
      return { ...data, batches: change(data.batches) }
  }
}

function yearToForm(row: Row): YearForm {
  return {
    name: String(row.name),
    startsOn: String(row.starts_on),
    endsOn: String(row.ends_on),
    isCurrent: Number(row.is_current) === 1,
  }
}
function classToForm(row: Row): ClassForm {
  return { name: String(row.name), sortOrder: String(row.sort_order) }
}
function subjectToForm(row: Row): SubjectForm {
  return { name: String(row.name), code: row.code === null ? '' : String(row.code) }
}
function label(row: Row): string {
  return String(row.name)
}

export function AcademicsScreen() {
  const { t } = useTranslation()
  const db = getDb()
  const [savedCount, setSavedCount] = useState(0)
  const query = useQuery({ queryKey: KEY, queryFn: () => getAll(db) })
  const yearFormControl = useForm<YearForm>({
    resolver: zodResolver(yearForm),
    defaultValues: YEAR_DEFAULTS,
  })
  const classFormControl = useForm<ClassForm>({
    resolver: zodResolver(classForm),
    defaultValues: CLASS_DEFAULTS,
  })
  const subjectFormControl = useForm<SubjectForm>({
    resolver: zodResolver(subjectForm),
    defaultValues: SUBJECT_DEFAULTS,
  })

  const mutation = useOptimisticMutation<AcademicsData, Command>({
    mutationFn: async (command) => {
      if (command.type === 'save') await executeSave(db, command.command)
      else await executeDelete(db, command.command)
    },
    queryKey: KEY,
    patch: (current, event) => {
      const data = current ?? EMPTY
      if (event.type === 'delete') {
        const target = event.command
        return replaceList(data, target.kind, (rows) => rows.filter((row) => row.id !== target.id))
      }
      const save = event.command
      const row = previewRow(save)
      return replaceList(data, save.kind, (rows) =>
        save.id
          ? rows.map((existing) => (existing.id === save.id ? row : existing))
          : [...rows, row],
      )
    },
  })

  async function run(command: Command): Promise<void> {
    await mutation(command)
    setSavedCount((count) => count + 1)
  }

  if (query.isPending) {
    return (
      <p role="status" className="text-muted-foreground p-8 text-sm">
        {t('common.loading')}
      </p>
    )
  }
  if (query.isError) {
    return (
      <div role="alert" className="space-y-3 p-8">
        <p>{t('academics.loadFailed')}</p>
        <Button type="button" onClick={() => void query.refetch()}>
          {t('academics.retry')}
        </Button>
      </div>
    )
  }

  const data = query.data
  return (
    <div
      data-testid="academics-screen"
      className="mx-auto w-full max-w-4xl space-y-10 px-4 py-8 sm:px-6 lg:px-8"
    >
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.academics')}</h1>
      <p data-testid="academics-status" data-saved={savedCount} role="status" className="sr-only">
        {savedCount}
      </p>

      <SimpleCrudSection
        testId="years"
        titleKey="academics.years"
        fields={[
          { name: 'name', labelKey: 'academics.name' },
          { name: 'startsOn', labelKey: 'academics.startsOn', type: 'date' },
          { name: 'endsOn', labelKey: 'academics.endsOn', type: 'date' },
          { name: 'isCurrent', labelKey: 'academics.isCurrent', type: 'checkbox' },
        ]}
        defaults={YEAR_DEFAULTS}
        form={yearFormControl}
        rows={data.years}
        rowToForm={yearToForm}
        rowLabel={label}
        onSave={(values, id, version) =>
          run({ type: 'save', command: { kind: 'years', values, id, version } })
        }
        onDelete={(id, version) => run({ type: 'delete', command: { kind: 'years', id, version } })}
      />

      <SimpleCrudSection
        testId="classes"
        titleKey="academics.classes"
        fields={[
          { name: 'name', labelKey: 'academics.name' },
          { name: 'sortOrder', labelKey: 'academics.sortOrder', type: 'number' },
        ]}
        defaults={CLASS_DEFAULTS}
        form={classFormControl}
        rows={data.classes}
        rowToForm={classToForm}
        rowLabel={label}
        onSave={(values, id, version) =>
          run({ type: 'save', command: { kind: 'classes', values, id, version } })
        }
        onDelete={(id, version) =>
          run({ type: 'delete', command: { kind: 'classes', id, version } })
        }
      />

      <SimpleCrudSection
        testId="subjects"
        titleKey="academics.subjects"
        fields={[
          { name: 'name', labelKey: 'academics.name' },
          { name: 'code', labelKey: 'academics.code' },
        ]}
        defaults={SUBJECT_DEFAULTS}
        form={subjectFormControl}
        rows={data.subjects}
        rowToForm={subjectToForm}
        rowLabel={label}
        onSave={(values, id, version) =>
          run({ type: 'save', command: { kind: 'subjects', values, id, version } })
        }
        onDelete={(id, version) =>
          run({ type: 'delete', command: { kind: 'subjects', id, version } })
        }
      />

      <BatchSection
        years={data.years}
        classes={data.classes}
        rows={data.batches}
        onSave={(values, id, version) =>
          run({ type: 'save', command: { kind: 'batches', values, id, version } })
        }
        onDelete={(id, version) =>
          run({ type: 'delete', command: { kind: 'batches', id, version } })
        }
      />
    </div>
  )
}
