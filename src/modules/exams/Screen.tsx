/**
 * Exam list and create form (T-061). Picks a batch and subject, sets the exam date and marks
 * boundaries, then opens the marks grid at /exams/:id. Existing exams link to their grids.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getDb } from '@/core/db/client'
import { today } from '@/core/dates/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createExam, examOptions, ExamsValidationError, formOptions } from './service'

export function Screen() {
  const { t } = useTranslation()
  const db = getDb()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const options = useQuery({ queryKey: ['exams', 'form-options'], queryFn: () => formOptions(db) })
  const exams = useQuery({ queryKey: ['exams', 'list'], queryFn: () => examOptions(db) })

  const [batchId, setBatchId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [heldOn, setHeldOn] = useState(() => today())
  const [name, setName] = useState('')
  const [fullMarks, setFullMarks] = useState('100')
  const [passMarks, setPassMarks] = useState('33')
  const [saving, setSaving] = useState(false)

  async function onCreate() {
    setSaving(true)
    try {
      const id = await createExam(db, {
        batchId,
        subjectId: subjectId === '' ? null : subjectId,
        heldOn,
        name,
        fullMarks: Number(fullMarks),
        passMarks: Number(passMarks),
      })
      await queryClient.invalidateQueries({ queryKey: ['exams', 'list'] })
      toast.success(t('exams.created'))
      navigate(`/exams/${id}`)
    } catch (error) {
      if (!(error instanceof ExamsValidationError)) throw error
      toast.error(t('exams.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('exams.title')}</h1>

      <section className="space-y-3 rounded border p-4" aria-labelledby="create-exam-heading">
        <h2 id="create-exam-heading" className="text-lg font-medium">
          {t('exams.createTitle')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="exam-batch">{t('exams.batch')}</Label>
            <select
              id="exam-batch"
              data-testid="exam-batch"
              className="border-input bg-background w-full rounded border px-3 py-2 text-sm"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
            >
              <option value="">—</option>
              {options.data?.batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="exam-subject">{t('exams.subject')}</Label>
            <select
              id="exam-subject"
              data-testid="exam-subject"
              className="border-input bg-background w-full rounded border px-3 py-2 text-sm"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">{t('exams.none')}</option>
              {options.data?.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="exam-name">{t('exams.name')}</Label>
            <Input
              id="exam-name"
              data-testid="exam-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="exam-date">{t('exams.date')}</Label>
            <Input
              id="exam-date"
              data-testid="exam-date"
              type="date"
              value={heldOn}
              onChange={(e) => setHeldOn(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="exam-full-marks">{t('exams.fullMarks')}</Label>
            <Input
              id="exam-full-marks"
              data-testid="exam-full-marks"
              type="number"
              min="1"
              step="any"
              value={fullMarks}
              onChange={(e) => setFullMarks(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="exam-pass-marks">{t('exams.passMarks')}</Label>
            <Input
              id="exam-pass-marks"
              data-testid="exam-pass-marks"
              type="number"
              min="0"
              step="any"
              value={passMarks}
              onChange={(e) => setPassMarks(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          data-testid="exam-create"
          disabled={saving || batchId === '' || name.trim() === ''}
          onClick={() => void onCreate()}
        >
          {t('exams.create')}
        </Button>
      </section>

      <section className="space-y-2" aria-labelledby="existing-exams-heading">
        <h2 id="existing-exams-heading" className="text-lg font-medium">
          {t('exams.existing')}
        </h2>
        {exams.data?.length === 0 || !exams.data ? (
          <p className="text-muted-foreground text-sm">{t('exams.noExams')}</p>
        ) : (
          <ul className="divide-y">
            {exams.data.map((exam) => (
              <li key={exam.id}>
                <button
                  type="button"
                  data-testid="exam-link"
                  className="w-full py-2 text-left text-sm hover:underline"
                  onClick={() => navigate(`/exams/${exam.id}`)}
                >
                  {exam.name}{' '}
                  <span className="text-muted-foreground">
                    · {exam.batchName} · {exam.subjectName} · {exam.heldOn}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
