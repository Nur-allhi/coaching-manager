import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { routeDefinitions } from '@/app/router'

// The shell test mounts every route including the data-backed dashboard. jsdom has no Worker, so
// give the dashboard an empty Db; this test is about routing, not database initialisation.
vi.mock('@/core/db/client', () => ({
  getDb: () => ({
    query: async () => [],
    run: async () => ({ changes: 0 }),
    tx: async (fn: (db: unknown) => unknown) => fn({}),
    exportBytes: async () => new Uint8Array(),
    importBytes: async () => undefined,
  }),
}))

function renderAt(path: string) {
  const router = createMemoryRouter(routeDefinitions(), { initialEntries: [path] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('app shell', () => {
  it('renders the product brand in the sidebar', async () => {
    renderAt('/')
    expect(await screen.findByRole('link', { name: /coaching manager/i })).toBeInTheDocument()
  })

  it('renders the Dashboard heading on the default route', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('shows a 404 screen for an unknown route instead of a blank page', async () => {
    renderAt('/does-not-exist')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
