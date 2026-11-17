/**
 * Shared optimistic mutation helper (T-035, D-040 B1; TAD.md §11).
 *
 * Every future mutation goes through this one hook: it applies an optimistic update, rolls it
 * back on error, and refetches on settle. `sonner` reports failures. Modules supply the
 * mutation, the query key to refetch, and how to patch the cached data.
 */
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18n from '@/core/i18n'

export interface OptimisticOptions<TData, TVars> {
  mutationFn: (vars: TVars) => Promise<void>
  /** Query key to optimistically patch and refetch. */
  queryKey: QueryKey
  /** Produce the optimistic value from the current cache and the variables. */
  patch: (current: TData | undefined, vars: TVars) => TData
}

/**
 * A hook returning an async `run(vars)` trigger. The optimistic patch, rollback and refetch are
 * handled here so no module reimplements them.
 */
export function useOptimisticMutation<TData, TVars>({
  mutationFn,
  queryKey,
  patch,
}: OptimisticOptions<TData, TVars>): (vars: TVars) => Promise<void> {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<TData>(queryKey)
      queryClient.setQueryData<TData>(queryKey, (current) => patch(current, vars))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous)
      } else {
        queryClient.removeQueries({ queryKey })
      }
      toast.error(i18n.t('backup.mutationFailed'))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })

  return async (vars: TVars) => {
    await mutation.mutateAsync(vars)
  }
}
