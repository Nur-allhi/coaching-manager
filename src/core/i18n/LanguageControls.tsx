/**
 * The language toggle and Bangla-digit switch live in the sidebar footer
 * (FRONTEND_SPEC.md §3.3). Both persist locally; neither touches the data layer.
 */
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getLanguage, setLanguage, type Language } from './index'
import { useBanglaDigits } from './useBanglaDigits'

const LANGUAGES: readonly Language[] = ['en', 'bn']

export function LanguageControls() {
  const { t } = useTranslation()
  const { enabled, setBanglaDigits, formatNumber } = useBanglaDigits()
  const language = getLanguage()

  return (
    <div className="space-y-2">
      <div className="flex gap-1" role="group" aria-label={t('i18n.language')}>
        {LANGUAGES.map((code) => (
          <Button
            key={code}
            type="button"
            size="sm"
            variant={language === code ? 'secondary' : 'ghost'}
            aria-pressed={language === code}
            onClick={() => setLanguage(code)}
          >
            {t(`i18n.${code === 'en' ? 'english' : 'bangla'}`)}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="bangla-digits"
          checked={enabled}
          onCheckedChange={setBanglaDigits}
          aria-label={t('i18n.banglaDigits')}
        />
        <Label htmlFor="bangla-digits" className="text-xs">
          {t('i18n.banglaDigits')}
        </Label>
      </div>
      <p className="text-muted-foreground">
        {t('i18n.sampleNumber')}: <span data-testid="sample-number">{formatNumber(1234567)}</span>
      </p>
    </div>
  )
}
