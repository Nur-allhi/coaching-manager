/**
 * Student profile shell (T-042, D-043 D1). Overview and History are real; the other four tabs are
 * honest placeholders until their owning modules land (TAD.md §2 forbids cross-module reads).
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDb } from '@/core/db/client'
import { VersionConflictError } from '@/core/db/repository'
import { Button } from '@/components/ui/button'
import { HistoryPanel } from '@/core/ui/HistoryPanel'
import { compressPhoto, photoDataUrl } from './photo'
import { getStudent, savePhoto, saveStudent, setStatus } from './service'
import { StudentFormFields } from './StudentFormFields'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  studentForm,
  PROFILE_TABS,
  formFromRow,
  statusKey,
  type ProfileTab,
  type StudentForm,
} from './types'

export function StudentProfile() {
  const { t } = useTranslation()
  const db = getDb()
  const { id = '' } = useParams()
  const [tab, setTab] = useState<ProfileTab>('overview')
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const query = useQuery({
    queryKey: ['students', 'profile', id],
    queryFn: async () => {
      const row = await getStudent(db, id)
      if (!row) throw new Error('not found')
      return row
    },
  })
  const form = useForm<StudentForm>({ resolver: zodResolver(studentForm) })

  if (query.isPending) {
    return (
      <p role="status" className="p-8 text-sm">
        {t('common.loading')}
      </p>
    )
  }
  if (query.isError || !query.data) {
    return (
      <div role="alert" className="space-y-3 p-8">
        <p>{t('students.notFound')}</p>
        <Button type="button" onClick={() => void query.refetch()}>
          {t('students.retry')}
        </Button>
      </div>
    )
  }

  const student = query.data

  async function submit(values: StudentForm) {
    setError('')
    try {
      await saveStudent(db, String(student.id), Number(student.version), values)
      setEditing(false)
      await query.refetch()
    } catch (cause) {
      setError(
        cause instanceof VersionConflictError ? t('students.conflict') : t('students.saveFailed'),
      )
    }
  }

  return (
    <div
      data-testid="student-profile"
      className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"
    >
      <h1 data-testid="profile-name" className="text-2xl font-semibold tracking-tight">
        {student.full_name}
      </h1>
      <p className="text-muted-foreground text-sm">{student.student_no}</p>

      <div role="tablist" aria-label={t('students.profile')} className="flex flex-wrap gap-2">
        {PROFILE_TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            data-testid={`profile-tab-${key}`}
            className={
              tab === key
                ? 'bg-primary text-primary-foreground rounded-md px-3 py-1 text-sm'
                : 'rounded-md border px-3 py-1 text-sm'
            }
            onClick={() => setTab(key)}
          >
            {t(`students.tab.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <section data-testid="profile-overview" role="tabpanel" className="space-y-4">
          {photoDataUrl(student.photo) && (
            <img
              src={photoDataUrl(student.photo) ?? undefined}
              alt={t('students.photo')}
              className="size-24 rounded-full object-cover"
            />
          )}
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{t('students.studentNo')}</dt>
              <dd>{student.student_no}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('students.status')}</dt>
              <dd data-testid="profile-status">{t(`students.${statusKey(student.status)}`)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('students.phone')}</dt>
              <dd>{student.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('students.guardianName')}</dt>
              <dd>{student.guardian_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('students.admittedOn')}</dt>
              <dd>{student.admitted_on}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              data-testid="profile-edit"
              onClick={() => {
                form.reset(formFromRow(student))
                setEditing(true)
              }}
            >
              {t('students.edit')}
            </Button>
            <select
              aria-label={t('students.status')}
              data-testid="profile-status-select"
              className="border-input h-9 rounded-md border px-2 text-sm"
              value={student.status}
              onChange={(event) =>
                void setStatus(
                  db,
                  String(student.id),
                  Number(student.version),
                  event.target.value as StudentForm['status'],
                )
                  .then(() => query.refetch())
                  .catch(() => {
                    setError(t('students.conflict'))
                    void query.refetch() // restore the displayed value from the database
                  })
              }
            >
              <option value="active">{t('students.active')}</option>
              <option value="dropped">{t('students.dropped')}</option>
              <option value="passed_out">{t('students.passedOut')}</option>
            </select>
            <label className="border-input inline-flex h-9 items-center rounded-md border px-3 text-sm">
              {t('students.photo')}
              <input
                type="file"
                accept="image/*"
                data-testid="profile-photo"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  void compressPhoto(file)
                    .then((bytes) =>
                      savePhoto(db, String(student.id), Number(student.version), bytes),
                    )
                    .then(() => query.refetch())
                    .catch(() => setError(t('students.photoFailed')))
                }}
              />
            </label>
          </div>
          {editing && (
            <form
              onSubmit={form.handleSubmit((values) => void submit(values))}
              className="space-y-4"
            >
              <StudentFormFields form={form} admittedOn={student.admitted_on} />
              <p data-testid="profile-error" role="alert" className="text-destructive text-sm">
                {error}
              </p>
              <Button type="submit" data-testid="profile-save">
                {t('students.save')}
              </Button>
            </form>
          )}
        </section>
      )}

      {tab === 'history' && (
        <section data-testid="profile-history" role="tabpanel">
          <HistoryPanel
            table="students"
            recordId={String(student.id)}
            onRestored={() => void query.refetch()}
          />
        </section>
      )}

      {PROFILE_TABS.filter((key) => !['overview', 'history'].includes(key)).map((key) =>
        tab === key ? (
          <section
            key={key}
            data-testid={`profile-${key}`}
            role="tabpanel"
            className="text-muted-foreground text-sm"
          >
            {t('students.tabPlaceholder')}
          </section>
        ) : null,
      )}
    </div>
  )
}
