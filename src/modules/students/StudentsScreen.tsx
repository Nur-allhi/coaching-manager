/**
 * Student list (T-042, D-043 E1). Debounced FTS search, status filter, a trash view with restore,
 * and a virtualized table so 5,000 rows stay responsive. Four async states are rendered.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDb } from '@/core/db/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOptimisticMutation } from '@/core/ui/use-optimistic-mutation'
import { statusKey, type StudentRow, type StudentStatus } from './types'
import { listStudents, listTrash, removeStudent, restoreStudent } from './service'

const KEY = ['students'] as const
type Command = { kind: 'remove' | 'restore'; id: string; version: number }

export function StudentsScreen() {
  const { t } = useTranslation()
  const db = getDb()
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  const [status, setStatus] = useState<'' | StudentStatus>('')
  const [trashView, setTrashView] = useState(false)

  useEffect(() => {
    const handle = window.setTimeout(() => setTerm(query), 200)
    return () => window.clearTimeout(handle)
  }, [query])

  const list = useQuery({
    queryKey: [...KEY, term, status, trashView],
    queryFn: () =>
      trashView ? listTrash(db) : listStudents(db, { query: term, status: status || undefined }),
  })

  const mutation = useOptimisticMutation<StudentRow[], Command>({
    mutationFn: async (command) => {
      if (command.kind === 'remove') await removeStudent(db, command.id, command.version)
      else await restoreStudent(db, command.id, command.version)
    },
    queryKey: [...KEY, term, status, trashView],
    patch: (rows, command) =>
      command.kind === 'remove'
        ? (rows ?? []).filter((row) => row.id !== command.id)
        : (rows ?? []).filter((row) => row.id !== command.id),
  })

  const rows = list.data ?? []
  const parentRef = useRef<HTMLDivElement>(null)
  // REPO_RULES §7.6 #19 mandates TanStack Virtual for lists that can fill a screen; its
  // imperative handle is intentionally not memoizable.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  })
  const items = virtualizer.getVirtualItems()
  const columns = useMemo(() => ['student_no', 'full_name', 'phone', 'status'] as const, [])

  function toggleTrash() {
    setTrashView((value) => !value)
    setTerm('')
    setQuery('')
    setStatus('')
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.students')}</h1>
        <div className="flex gap-2">
          <Link
            to="/students/new"
            data-testid="new-admission"
            className="bg-primary text-primary-foreground inline-flex h-9 items-center rounded-md px-4 text-sm font-medium"
          >
            {t('students.admit')}
          </Link>
          <Button type="button" variant="outline" data-testid="toggle-trash" onClick={toggleTrash}>
            {trashView ? t('students.backToList') : t('students.trash')}
          </Button>
        </div>
      </div>

      {!trashView && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="student-search">{t('students.search')}</Label>
            <Input
              id="student-search"
              data-testid="student-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('students.searchPlaceholder')}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="student-filter-status">{t('students.status')}</Label>
            <select
              id="student-filter-status"
              data-testid="student-filter-status"
              className="border-input h-9 w-full rounded-md border px-2 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as '' | StudentStatus)}
            >
              <option value="">{t('students.allStatuses')}</option>
              <option value="active">{t('students.active')}</option>
              <option value="dropped">{t('students.dropped')}</option>
              <option value="passed_out">{t('students.passedOut')}</option>
            </select>
          </div>
        </div>
      )}

      <p data-testid="students-count" className="text-muted-foreground text-sm">
        {t('students.count')}: {rows.length}
      </p>

      {list.isPending && (
        <p role="status" className="text-muted-foreground text-sm">
          {t('common.loading')}
        </p>
      )}
      {list.isError && (
        <div role="alert" className="space-y-3">
          <p>{t('students.loadFailed')}</p>
          <Button type="button" onClick={() => void list.refetch()}>
            {t('students.retry')}
          </Button>
        </div>
      )}
      {list.isSuccess && rows.length === 0 && (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">{t('students.empty')}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQuery('')
              setTerm('')
              setStatus('')
            }}
          >
            {t('students.clearFilters')}
          </Button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-md border">
          <div className="grid grid-cols-[7rem_1fr_9rem_7rem] gap-2 border-b p-2 text-sm font-medium">
            {columns.map((column) => (
              <span key={column}>{t(`students.column.${column}`)}</span>
            ))}
          </div>
          <div ref={parentRef} className="h-96 overflow-y-auto">
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {items.map((item) => {
                const row = rows[item.index]
                if (!row) return null
                return (
                  <div
                    key={String(row.id)}
                    data-testid="student-row"
                    data-name={row.full_name}
                    className="absolute inset-x-0 grid grid-cols-[7rem_1fr_9rem_7rem] items-center gap-2 border-b px-2 text-sm"
                    style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                  >
                    <span>{row.student_no}</span>
                    <Link to={`/students/${String(row.id)}`} className="underline">
                      {row.full_name}
                    </Link>
                    <span>{row.phone ?? '—'}</span>
                    <span className="flex items-center gap-1">
                      <span className="truncate">{t(`students.${statusKey(row.status)}`)}</span>
                      {trashView ? (
                        <Button
                          type="button"
                          size="sm"
                          data-testid="student-restore"
                          onClick={() =>
                            void mutation({
                              kind: 'restore',
                              id: String(row.id),
                              version: Number(row.version),
                            })
                          }
                        >
                          {t('students.restore')}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          data-testid="student-delete"
                          onClick={() =>
                            void mutation({
                              kind: 'remove',
                              id: String(row.id),
                              version: Number(row.version),
                            })
                          }
                        >
                          {t('students.delete')}
                        </Button>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
