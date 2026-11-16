/**
 * Draft persistence for the error boundary (T-017, decision D-029 A1).
 *
 * A global error boundary unmounts the whole tree, including any form, so in-memory form state
 * cannot survive a render error. Dirty values are written to sessionStorage on every change and
 * read back by the recovery UI. One tab is the product model (PRD.md §4), so sessionStorage is
 * safe; all access is guarded because private browsing can throw.
 */
export interface Draft {
  formId: string
  values: Record<string, string>
  savedAt: number
}

const PREFIX = 'ccm:draft:'

function key(formId: string): string {
  return `${PREFIX}${formId}`
}

function storage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage
  } catch {
    return undefined
  }
}

export function saveDraft(formId: string, values: Record<string, string>): void {
  const store = storage()
  if (!store) return
  try {
    const draft: Draft = { formId, values: { ...values }, savedAt: Date.now() }
    store.setItem(key(formId), JSON.stringify(draft))
  } catch {
    // Quota or private mode: persistence is best-effort, never a reason to fail a render.
  }
}

export function loadDraft(formId: string): Draft | undefined {
  const store = storage()
  if (!store) return undefined
  try {
    const raw = store.getItem(key(formId))
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Draft
    return parsed && typeof parsed.values === 'object' ? parsed : undefined
  } catch {
    return undefined
  }
}

export function clearDraft(formId: string): void {
  try {
    storage()?.removeItem(key(formId))
  } catch {
    // ignored — best effort
  }
}

/** All persisted drafts, for the error boundary's recovery screen. */
export function loadAllDrafts(): Draft[] {
  const store = storage()
  if (!store) return []
  const drafts: Draft[] = []
  try {
    for (let i = 0; i < store.length; i += 1) {
      const name = store.key(i)
      if (!name?.startsWith(PREFIX)) continue
      const raw = store.getItem(name)
      if (!raw) continue
      const parsed = JSON.parse(raw) as Draft
      if (parsed && typeof parsed.values === 'object') drafts.push(parsed)
    }
  } catch {
    // ignored
  }
  return drafts
}
