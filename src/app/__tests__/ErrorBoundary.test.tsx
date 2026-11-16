import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { loadAllDrafts, loadDraft, saveDraft } from '@/core/ui/form-drafts'

function Boom(): never {
  throw new Error('intentional')
}

describe('form drafts', () => {
  beforeEach(() => sessionStorage.clear())

  it('saves, loads and clears a draft', () => {
    saveDraft('f', { name: 'Rahim' })
    expect(loadAllDrafts()).toEqual([
      { formId: 'f', values: { name: 'Rahim' }, savedAt: expect.any(Number) },
    ])
    expect(loadAllDrafts()[0]?.values.name).toBe('Rahim')
  })

  it('reads back a single draft', () => {
    saveDraft('f', { name: 'Karim' })
    expect(loadDraft('f')?.values.name).toBe('Karim')
    expect(loadDraft('missing')).toBeUndefined()
  })
})

describe('ErrorBoundary', () => {
  beforeEach(() => sessionStorage.clear())

  it('shows a recoverable message instead of a blank page on a render error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    spy.mockRestore()
  })

  it('lists restored form values in the recovery screen', () => {
    saveDraft('probe', { name: 'Rahim', phone: '' })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Rahim')).toBeInTheDocument()
    expect(screen.getByText(/unsaved values were saved/i)).toBeInTheDocument()
    spy.mockRestore()
  })
})
