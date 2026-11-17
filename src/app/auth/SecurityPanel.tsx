/** Settings security section: PIN setup, idle timeout, manual lock and the at-rest caveat. */
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  authChanged,
  getIdleMinutes,
  hasPin,
  isValidPinFormat,
  lock,
  setIdleMinutes,
  setPin,
  unlock,
} from '@/core/auth'
import { useAuth } from './useAuth'

const ROLE_KEYS = {
  admin: 'auth.roleAdmin',
  accountant: 'auth.roleAccountant',
  teacher: 'auth.roleTeacher',
} as const

export function SecurityPanel() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [pin, setPinText] = useState('')
  const [confirm, setConfirm] = useState('')
  const [idle, setIdle] = useState(String(getIdleMinutes()))
  const [message, setMessage] = useState('')

  async function savePin(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    if (!isValidPinFormat(pin)) {
      setMessage(t('auth.weakPin'))
      return
    }
    if (pin !== confirm) {
      setMessage(t('auth.mismatch'))
      return
    }
    await setPin(pin)
    await unlock(pin) // stay unlocked in this tab after opting in
    setPinText('')
    setConfirm('')
    setMessage(t('settings.saved'))
    authChanged()
  }

  return (
    <section data-testid="security-panel" className="space-y-3">
      <h2 className="text-lg font-medium">{t('auth.security')}</h2>
      <p className="text-muted-foreground text-sm">
        {t('auth.pinStatus')}: {hasPin() ? t('auth.pinOn') : t('auth.pinOff')} ·{' '}
        {t('auth.currentRole')}: {t(ROLE_KEYS[session?.role ?? 'admin'])}
      </p>

      <form onSubmit={(event) => void savePin(event)} className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="security-pin">{t('auth.pinLabel')}</Label>
          <Input
            id="security-pin"
            type="password"
            inputMode="numeric"
            data-testid="security-pin"
            value={pin}
            onChange={(event) => setPinText(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="security-confirm">{t('auth.confirmLabel')}</Label>
          <Input
            id="security-confirm"
            type="password"
            inputMode="numeric"
            data-testid="security-confirm"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="outline" data-testid="security-set-pin">
            {t('auth.setOrChangePin')}
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="security-idle">{t('auth.idleMinutes')}</Label>
          <Input
            id="security-idle"
            type="number"
            min="1"
            step="1"
            className="w-24"
            data-testid="security-idle"
            value={idle}
            onChange={(event) => setIdle(event.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          data-testid="security-idle-save"
          onClick={() => {
            const value = Number(idle)
            if (Number.isFinite(value) && value > 0) setIdleMinutes(value)
          }}
        >
          {t('settings.save')}
        </Button>
        <Button type="button" variant="outline" data-testid="security-lock" onClick={() => lock()}>
          {t('auth.lockedNow')}
        </Button>
      </div>

      <p data-testid="security-message" role="status" className="text-sm">
        {message}
      </p>
      <p className="text-muted-foreground text-sm">{t('auth.notEncrypted')}</p>
    </section>
  )
}
