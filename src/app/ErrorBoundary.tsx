/**
 * Global error boundary (T-017, decision D-029 A1; translated in T-020).
 *
 * A render error anywhere under the shell is caught here instead of showing a blank page. The
 * recovery screen lists any form values restored from sessionStorage, so the admin does not
 * lose what they were typing. `key` is bumped on retry to force a fresh mount of the crashed
 * subtree; drafts stay until the admin chooses to discard them.
 *
 * The class does the catching; a small function wrapper supplies `t` from i18next so a language
 * change re-renders the recovery screen too.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { loadAllDrafts } from '@/core/ui/form-drafts'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface BoundaryProps extends Props {
  t: TFunction
}

interface State {
  error: Error | null
  attempt: number
}

class ErrorBoundaryClass extends Component<BoundaryProps, State> {
  override state: State = { error: null, attempt: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // The console is the right place for the diagnostic; the user gets plain translated words.
    console.error('Unhandled render error', error, info.componentStack)
  }

  private retry = () => {
    this.setState((state) => ({ error: null, attempt: state.attempt + 1 }))
  }

  override render(): ReactNode {
    const { t } = this.props
    if (!this.state.error) {
      return <div key={this.state.attempt}>{this.props.children}</div>
    }

    const drafts = loadAllDrafts()
    return (
      <div role="alert" className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('error.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('error.description')}</p>

        {drafts.length > 0 && (
          <section className="bg-card rounded-lg border p-4 text-sm">
            <h2 className="mb-2 font-medium">{t('error.draftsTitle')}</h2>
            {drafts.map((draft) => (
              <div key={draft.formId} className="space-y-1">
                {Object.entries(draft.values)
                  .filter(([, value]) => value !== '')
                  .map(([field, value]) => (
                    <p key={field}>
                      <span className="text-muted-foreground">{field}: </span>
                      <span className="font-medium">{value}</span>
                    </p>
                  ))}
              </div>
            ))}
          </section>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={this.retry}>{t('error.retry')}</Button>
          <Button variant="outline" asChild>
            <a href="/">{t('error.goDashboard')}</a>
          </Button>
        </div>
      </div>
    )
  }
}

export function ErrorBoundary(props: Props) {
  const { t } = useTranslation()
  return <ErrorBoundaryClass t={t} {...props} />
}
