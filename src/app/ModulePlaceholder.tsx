/**
 * The default screen for a module whose real UI lands in a later ticket.
 *
 * T-016's acceptance needs each sidebar entry to navigate to a route that renders its
 * heading. This keeps those routes real and testable without pretending the feature exists.
 * The real screens replace these per-module components in T-020 onward.
 */
export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-2 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">
        This screen is being built. Navigation and the app shell are in place.
      </p>
    </div>
  )
}
