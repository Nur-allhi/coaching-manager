/**
 * Settings screen (T-040, D-041). Centre profile, currency, receipt format, a fixed seven-row
 * grading scale, language, and backup/storage status. Values load through TanStack Query and save
 * through the shared optimistic mutation helper (rollback on error). Every input has a bound label.
 */
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getDb } from '@/core/db/client'
import { getLanguage, setLanguage, type Language } from '@/core/i18n'
import { getPersistenceStatus, type StoragePersistence } from '@/app/persistent-storage'
import { lastFileExport } from '@/core/backup/health'
import { listSnapshots } from '@/core/backup/snapshots'
import { opfsStorage } from '@/core/backup/storage'
import { useOptimisticMutation } from '@/core/ui/use-optimistic-mutation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getAllSettings, setSetting, type AllSettings } from './repository'
import type { CentreProfile, GradingScale } from './defaults'

const SETTINGS_KEY = ['settings'] as const

export function SettingsScreen() {
  const { t } = useTranslation()
  const db = getDb()
  const storage = opfsStorage()

  const settings = useQuery({ queryKey: SETTINGS_KEY, queryFn: () => getAllSettings(db) })
  const [draft, setDraft] = useState<AllSettings | null>(null)
  const [status, setStatus] = useState('')
  const [persistence, setPersistence] = useState<StoragePersistence | null>(null)
  const [lastExport, setLastExport] = useState<number | null>(null)
  const [snapshotCount, setSnapshotCount] = useState(0)

  useEffect(() => {
    let active = true
    void (async () => {
      const [p, e, s] = await Promise.all([
        getPersistenceStatus(),
        lastFileExport(db),
        listSnapshots(storage),
      ])
      if (active) {
        setPersistence(p)
        setLastExport(e)
        setSnapshotCount(s.length)
      }
    })()
    return () => {
      active = false
    }
  }, [db, storage])

  // Seed the editable draft from loaded settings once available.
  useEffect(() => {
    void (async () => {
      if (settings.data && !draft) setDraft(settings.data)
    })()
  }, [settings.data, draft])

  const save = useOptimisticMutation<AllSettings | undefined, AllSettings>({
    mutationFn: async (value) => {
      await setSetting(db, 'centre', value.centre)
      await setSetting(db, 'currency', value.currency)
      await setSetting(db, 'receiptFormat', value.receiptFormat)
      await setSetting(db, 'gradingScale', value.gradingScale)
    },
    queryKey: SETTINGS_KEY,
    patch: (current, vars) => vars ?? current,
  })

  const statusKey = !persistence
    ? 'settings.persistenceChecking'
    : !persistence.supported
      ? 'settings.persistenceUnsupported'
      : persistence.persisted
        ? 'settings.persistenceEnabled'
        : 'settings.persistenceDisabled'

  if (!draft) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <p role="status" className="text-muted-foreground text-sm">
          …
        </p>
      </div>
    )
  }

  function setCentre(field: keyof CentreProfile, value: string) {
    setDraft((d) => (d ? { ...d, centre: { ...d.centre, [field]: value } } : d))
  }

  function setGrade(index: number, field: keyof GradingScale[number], value: string | number) {
    setDraft((d) => {
      if (!d) return d
      const next = d.gradingScale.map((g, i) => (i === index ? { ...g, [field]: value } : g))
      return { ...d, gradingScale: next }
    })
  }

  async function onSave() {
    if (!draft) return
    setStatus('saving')
    try {
      await save(draft)
      setStatus('saved')
    } catch {
      setStatus('saveFailed')
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
      <p data-testid="settings-status" role="status" className="sr-only">
        {status}
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t('settings.profile')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="centre-name">{t('settings.centreName')}</Label>
            <Input
              id="centre-name"
              data-testid="centre-name"
              value={draft.centre.name}
              onChange={(e) => setCentre('name', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="centre-phone">{t('settings.centrePhone')}</Label>
            <Input
              id="centre-phone"
              value={draft.centre.phone}
              onChange={(e) => setCentre('phone', e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="centre-address">{t('settings.centreAddress')}</Label>
            <Input
              id="centre-address"
              value={draft.centre.address}
              onChange={(e) => setCentre('address', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="currency">{t('settings.currency')}</Label>
          <Input
            id="currency"
            value={draft.currency}
            onChange={(e) => setDraft((d) => (d ? { ...d, currency: e.target.value } : d))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="receipt-format">{t('settings.receiptFormat')}</Label>
          <Input
            id="receipt-format"
            value={draft.receiptFormat}
            onChange={(e) => setDraft((d) => (d ? { ...d, receiptFormat: e.target.value } : d))}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">{t('settings.gradingScale')}</h2>
        <div className="oc-table overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th scope="col" className="p-2 text-left">
                  {t('settings.grade')}
                </th>
                <th scope="col" className="p-2 text-left">
                  {t('settings.minMarks')}
                </th>
                <th scope="col" className="p-2 text-left">
                  {t('settings.maxMarks')}
                </th>
                <th scope="col" className="p-2 text-left">
                  {t('settings.points')}
                </th>
              </tr>
            </thead>
            <tbody>
              {draft.gradingScale.map((grade, index) => (
                <tr key={grade.label}>
                  <td className="p-2">{grade.label}</td>
                  <td className="p-2">
                    <Input
                      aria-label={`${t('settings.minMarks')} ${grade.label}`}
                      type="number"
                      className="w-20"
                      value={grade.min}
                      onChange={(e) => setGrade(index, 'min', Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      aria-label={`${t('settings.maxMarks')} ${grade.label}`}
                      type="number"
                      className="w-20"
                      value={grade.max}
                      onChange={(e) => setGrade(index, 'max', Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      aria-label={`${t('settings.points')} ${grade.label}`}
                      type="number"
                      step="0.5"
                      className="w-20"
                      value={grade.points}
                      onChange={(e) => setGrade(index, 'points', Number(e.target.value))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">{t('i18n.language')}</h2>
        <div className="flex gap-2">
          {(['en', 'bn'] as Language[]).map((lang) => (
            <Button
              key={lang}
              type="button"
              variant={getLanguage() === lang ? 'default' : 'outline'}
              onClick={() => void setLanguage(lang)}
            >
              {lang === 'en' ? t('i18n.english') : t('i18n.bangla')}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">{t('settings.backupStatus')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('settings.lastExport')}:{' '}
          {lastExport ? new Date(lastExport).toISOString().slice(0, 10) : '—'}
        </p>
        <p className="text-muted-foreground text-sm">
          {t('settings.snapshotCount')}: {snapshotCount}
        </p>
        <p className="text-muted-foreground text-sm">
          {t('settings.persistence')}: {t(statusKey)}
        </p>
      </section>

      <Button type="button" data-testid="settings-save" onClick={() => void onSave()}>
        {status === 'saving' ? t('settings.saving') : t('settings.save')}
      </Button>
    </div>
  )
}
