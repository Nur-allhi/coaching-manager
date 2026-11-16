import { lazy, Suspense } from 'react'

/**
 * Application root.
 *
 * P0-1 only renders the scaffold landing screen. The real shell, router,
 * registry, error boundary and i18n wiring land in P0-6.
 */

// Dev-only visual feedback toolbar. `import.meta.env.DEV` is statically false in a
// production build, so this chunk is dropped from the bundle entirely.
const DevFeedback = import.meta.env.DEV
  ? lazy(() => import('@/app/dev/DevFeedback').then((m) => ({ default: m.DevFeedback })))
  : null

export function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Coaching Manager</h1>
        <p className="text-muted-foreground">
          Offline-first coaching center management. Foundation scaffold is in place.
        </p>
      </header>

      <section
        aria-label="Scaffold status"
        className="bg-card text-card-foreground rounded-lg border p-4"
      >
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <dt className="text-muted-foreground">Database</dt>
          <dd>SQLite (WASM) over OPFS — worker spike in P0-2</dd>
          <dt className="text-muted-foreground">Money</dt>
          <dd>Integer paisa, never floats</dd>
          <dt className="text-muted-foreground">Network</dt>
          <dd>None at runtime, fully offline</dd>
        </dl>
      </section>

      {DevFeedback && (
        <Suspense fallback={null}>
          <DevFeedback />
        </Suspense>
      )}
    </main>
  )
}
