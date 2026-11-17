/** Admission form (T-042). Allocates the number on submit and optionally stores a small photo. */
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDb } from '@/core/db/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { compressPhoto } from './photo'
import { admit, previewStudentNo } from './service'
import { StudentFormFields } from './StudentFormFields'
import { studentForm, type StudentForm } from './types'

const TODAY = new Date().toISOString().slice(0, 10)
const EMPTY: StudentForm = {
  fullName: '',
  gender: '',
  dob: '',
  phone: '',
  guardianName: '',
  guardianPhone: '',
  address: '',
  schoolName: '',
  admittedOn: TODAY,
  status: 'active',
  notes: '',
}

export function AdmissionScreen() {
  const { t } = useTranslation()
  const db = getDb()
  const navigate = useNavigate()
  const form = useForm<StudentForm>({ resolver: zodResolver(studentForm), defaultValues: EMPTY })
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState<Uint8Array | null>(null)
  const admittedOn = useWatch({ control: form.control, name: 'admittedOn' })
  const [number, setNumber] = useState('…')
  useEffect(() => {
    let active = true
    void previewStudentNo(db, admittedOn || TODAY).then((value) => {
      if (active) setNumber(value)
    })
    return () => {
      active = false
    }
  }, [db, admittedOn])

  async function submit(values: StudentForm, photo: Uint8Array | null) {
    setError('')
    try {
      const id = await admit(db, values, photo)
      navigate(`/students/${id}`)
    } catch {
      setError(t('students.saveFailed'))
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t('students.admit')}</h1>
      <p data-testid="student-number-preview" className="text-muted-foreground text-sm">
        {t('students.studentNo')}: {number}
      </p>
      <form
        onSubmit={form.handleSubmit((values) => void submit(values, photo))}
        className="space-y-4"
      >
        <StudentFormFields form={form} admittedOn={TODAY} />
        <div className="space-y-1">
          <Label htmlFor="student-photo">{t('students.photo')}</Label>
          <Input
            id="student-photo"
            data-testid="student-photo"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file)
                void compressPhoto(file)
                  .then(setPhoto)
                  .catch(() => setError(t('students.photoFailed')))
            }}
          />
        </div>
        <p data-testid="admission-error" role="alert" className="text-destructive text-sm">
          {error}
        </p>
        <div className="flex gap-2">
          <Button type="submit" data-testid="admission-save">
            {t('students.admit')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/students')}>
            {t('students.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
