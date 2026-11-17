/** Inactivity PIN lock (T-080). A failed attempt never reveals why (SECURITY §3.5). */
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { unlock } from '@/core/auth'

export function PinLockScreen() {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!(await unlock(pin))) setError(t('auth.wrongPin'))
  }

  return (
    <main className="bg-background text-foreground flex min-h-dvh items-center justify-center p-6">
      <form
        onSubmit={(event) => void submit(event)}
        className="bg-card w-full max-w-md space-y-4 rounded-lg border p-6"
      >
        <h1 className="text-xl font-semibold tracking-tight" data-testid="lock-title">
          {t('auth.lockedTitle')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('auth.lockedDescription')}</p>
        <div className="space-y-1">
          <Label htmlFor="unlock-pin">{t('auth.pinLabel')}</Label>
          <Input
            id="unlock-pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            data-testid="unlock-pin"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />
        </div>
        <p data-testid="unlock-error" role="alert" className="text-destructive text-sm">
          {error}
        </p>
        <Button type="submit" data-testid="unlock-submit" className="w-full">
          {t('auth.unlock')}
        </Button>
      </form>
    </main>
  )
}
