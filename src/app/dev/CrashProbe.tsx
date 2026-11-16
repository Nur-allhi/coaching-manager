/**
 * Dev-only probe that triggers a render error on demand (T-017 E2E).
 *
 * The E2E spec needs a deterministic way to throw during render. `?crash=1` makes the component
 * throw; a dirty draft form lets the spec prove values survive the boundary. Not linked from
 * the app; routed at `/__crash-probe`.
 */
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDraftForm } from '@/core/ui/use-draft-form'
import { useNavigationGuard } from '@/app/useNavigationGuard'

export function CrashProbe() {
  const { values, setField, isDirty } = useDraftForm('crash-probe')
  useNavigationGuard(isDirty)

  if (new URLSearchParams(window.location.search).get('crash') === '1') {
    throw new Error('crash probe: intentional render error')
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Error recovery test</h1>
      <div className="space-y-2">
        <Label htmlFor="probe-name">Name</Label>
        <Input
          id="probe-name"
          value={values.name ?? ''}
          onChange={(event) => setField('name', event.target.value)}
        />
      </div>
      <Button asChild variant="destructive">
        <a href="/__crash-probe?crash=1">Trigger error</a>
      </Button>
    </div>
  )
}
