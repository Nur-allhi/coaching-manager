/**
 * Undo toast helper (T-034, D-039 A1).
 *
 * Future module services call `showUndoToast(auditId, db, ctx)` after a mutation. It shows a
 * sonner toast with an Undo action for 10 seconds (PRD W5). Clicking Undo calls the core
 * `undo()` through a transaction; the inverse write creates a NEW audit entry, so history is
 * never rewritten. Messages come from i18next so the toast is localized.
 *
 * The `Toaster` must be mounted once at the app root (done in RootLayout).
 */
import { toast } from 'sonner'
import i18n from '@/core/i18n'
import { undo } from '@/core/audit/undo'
import type { AuditContext } from '@/core/audit/write'
import type { Db } from '@/core/db/types'

export const UNDO_TOAST_DURATION_MS = 10_000

export interface UndoToastOptions {
  auditId: string
  db: Db
  ctx: AuditContext
  onUndone?: () => void | Promise<void>
}

/** Show a 10-second Undo toast for a completed mutation. */
export function showUndoToast({ auditId, db, ctx, onUndone }: UndoToastOptions): void {
  toast(i18n.t('undo.done'), {
    duration: UNDO_TOAST_DURATION_MS,
    action: {
      label: i18n.t('undo.undo'),
      onClick: async () => {
        try {
          await undo(db, ctx, auditId)
          await onUndone?.()
        } catch {
          toast.error(i18n.t('undo.failed'))
        }
      },
    },
  })
}
