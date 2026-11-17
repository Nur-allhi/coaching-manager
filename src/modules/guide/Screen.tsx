/** T-091 — short offline user guide with both language sets bundled in the app. */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

const LANGUAGES = ['en', 'bn'] as const
type GuideLanguage = (typeof LANGUAGES)[number]
const STEPS = [
  'admission',
  'enrollment',
  'fees',
  'attendance',
  'marks',
  'reports',
  'backup',
] as const

export function GuideScreen() {
  const { t } = useTranslation()
  const [language, setLanguage] = useState<GuideLanguage>('en')

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('guide.title')}</h1>
      <p className="text-muted-foreground text-sm">{t('guide.subtitle')}</p>

      <div
        role="tablist"
        aria-label={t('guide.title')}
        className="flex gap-2"
        data-testid="guide-tabs"
      >
        {LANGUAGES.map((option) => (
          <Button
            key={option}
            type="button"
            role="tab"
            size="sm"
            variant={option === language ? 'default' : 'outline'}
            aria-selected={option === language}
            data-testid={`guide-tab-${option}`}
            onClick={() => setLanguage(option)}
          >
            {t(`guide.tabs.${option}`, { lng: option })}
          </Button>
        ))}
      </div>

      <ol role="tabpanel" className="space-y-3" data-testid="guide-content">
        {STEPS.map((step, index) => (
          <li key={step} className="bg-card rounded-lg border p-4 text-sm">
            <span className="font-medium">{index + 1}. </span>
            <span data-testid={`guide-step-${step}`}>
              {t(`guide.steps.${step}`, { lng: language })}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
