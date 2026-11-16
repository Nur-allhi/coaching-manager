/**
 * A field-state hook that writes every change to sessionStorage (T-017, D-029 A1).
 *
 * It is a plain controlled-input helper, not a replacement for React Hook Form: the real forms
 * land in P2+. It exists so the error boundary can prove that values survive a render error,
 * and so every future form has one sanctioned way to persist its draft.
 */
import { useCallback, useEffect, useState } from 'react'
import { clearDraft, loadDraft, saveDraft } from '@/core/ui/form-drafts'

export interface DraftValues {
  [field: string]: string
}

export function useDraftForm(formId: string, initial: DraftValues = {}) {
  const [values, setValues] = useState<DraftValues>(() => loadDraft(formId)?.values ?? initial)

  useEffect(() => {
    saveDraft(formId, values)
  }, [formId, values])

  const setField = useCallback((field: string, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
  }, [])

  const clear = useCallback(() => {
    clearDraft(formId)
    setValues(initial)
  }, [formId, initial])

  return { values, setField, clear, isDirty: Object.values(values).some((v) => v !== '') }
}
