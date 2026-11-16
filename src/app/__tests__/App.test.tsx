import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routeDefinitions } from '@/app/router'

function renderAt(path: string) {
  const router = createMemoryRouter(routeDefinitions(), { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
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
