/**
 * Regression test for BUG-011: a missing exam must never resolve `undefined` into TanStack Query,
 * which logs "Query data cannot be undefined", and must render an honest not-found state instead.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Db } from '@/core/db/types'
import { getExam } from './service'
import { MarksGrid } from './MarksGrid'

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }))

vi.mock('@/core/db/client', () => ({
  getDb: () => ({ query: queryMock }),
}))

function renderAtMissingExam() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const router = createMemoryRouter([{ path: '/exams/:id', element: <MarksGrid /> }], {
    initialEntries: ['/exams/does-not-exist'],
  })
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('MarksGrid missing exam (BUG-011)', () => {
  beforeEach(() => {
    queryMock.mockReset()
    // The exam SELECT returns no rows, so getExam resolves to undefined.
    queryMock.mockResolvedValue([])
  })

  it('shows a not-found state and never logs the undefined-query-data error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      renderAtMissingExam()
      expect(await screen.findByRole('alert')).toHaveTextContent('Exam not found.')
      expect(screen.queryByRole('grid')).not.toBeInTheDocument()
      expect(errorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Query data cannot be undefined'),
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('documents the root cause: an undefined query result triggers the TanStack Query error', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(
        client.fetchQuery({
          queryKey: ['exams', 'detail', 'raw'],
          queryFn: () => getExam({ query: queryMock } as unknown as Db, 'does-not-exist'),
        }),
      ).rejects.toThrow()
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Query data cannot be undefined'),
      )
    } finally {
      errorSpy.mockRestore()
    }
  })
})
