/**
 * Import screen (T-081): download a template, upload CSV/Excel, map columns, preview row errors,
 * dry run, then commit valid rows after a forced pre-import snapshot (D-061).
 */
import { useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { getDb } from '@/core/db/client'
import { makeAuditContext } from '@/core/audit/write'
import { opfsStorage } from '@/core/backup/storage'
import { downloadCsv } from '@/modules/reports/export'
import { commitImport, previewImport, type ColumnMapping } from './import/service'
import {
  TEMPLATE_FIELDS,
  templateCsv,
  templateFileName,
  IMPORT_KINDS,
  type ImportPreview,
  type ImportKind,
} from './import'

export function ImportScreen() {
  const { t } = useTranslation()
  const db = getDb()
  const [kind, setKind] = useState<ImportKind>('students')
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  function chooseKind(next: ImportKind) {
    setKind(next)
    setPreview(null)
    setHeaders([])
    setMapping({})
    setStatus('')
  }

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    setFile(selected ?? null)
    setPreview(null)
    setStatus('')
    if (!selected) return
    try {
      const bytes = new Uint8Array(await selected.arrayBuffer())
      const text = new TextDecoder().decode(bytes)
      const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
      setHeaders(firstLine.split(',').map((value) => value.trim().replace(/^"|"$/g, '')))
      const next = await previewImport(db, selected.name, bytes, kind)
      setPreview(next)
    } catch {
      setStatus(t('import.readFailed'))
    }
  }

  async function refreshPreview() {
    if (!file) return
    setBusy(true)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      setPreview(await previewImport(db, file.name, bytes, kind, mapping))
      setStatus(t('import.dryRunDone'))
    } catch {
      setStatus(t('import.readFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function doImport() {
    if (!preview) return
    setBusy(true)
    try {
      const result = await commitImport(
        db,
        opfsStorage(),
        kind,
        preview,
        makeAuditContext(),
        Date.now(),
      )
      setStatus(t('import.committed', { count: result.imported }))
      setPreview(null)
      setFile(null)
    } catch {
      setStatus(t('import.commitFailed'))
    } finally {
      setBusy(false)
    }
  }

  const fields = TEMPLATE_FIELDS[kind]

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('import.title')}</h1>
        <Link className="text-sm underline" to="/data-tools">
          {t('import.backToBackups')}
        </Link>
      </div>

      <section className="space-y-2">
        <Label>{t('import.kind')}</Label>
        <div className="flex flex-wrap gap-2" data-testid="import-kinds">
          {IMPORT_KINDS.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={option === kind ? 'default' : 'outline'}
              data-testid={`import-kind-${option}`}
              onClick={() => chooseKind(option)}
            >
              {t(`import.kinds.${option}`)}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="link"
          data-testid="import-template"
          onClick={() => downloadCsv(templateCsv(kind), templateFileName(kind))}
        >
          {t('import.downloadTemplate')}
        </Button>
      </section>

      <section className="space-y-2">
        <Label htmlFor="import-file">{t('import.file')}</Label>
        <input
          id="import-file"
          type="file"
          accept=".csv,.xlsx"
          data-testid="import-file"
          onChange={(event) => void loadFile(event)}
        />
      </section>

      {headers.length > 0 && (
        <section data-testid="import-mapping" className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field} className="space-y-1">
              <Label htmlFor={`map-${field}`}>{field}</Label>
              <select
                id={`map-${field}`}
                className="border-input h-9 w-full rounded-md border px-2 text-sm"
                data-testid={`map-${field}`}
                value={mapping[field] ?? -1}
                onChange={(event) =>
                  setMapping((current) => ({ ...current, [field]: Number(event.target.value) }))
                }
              >
                <option value={-1}>—</option>
                {headers.map((header, index) => (
                  <option key={index} value={index}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </section>
      )}

      {preview && (
        <section className="space-y-2" data-testid="import-preview">
          <p className="text-sm" data-testid="import-summary">
            {t('import.summary', { valid: preview.validCount, invalid: preview.errorCount })}
          </p>
          <div className="oc-box overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">{t('import.row')}</th>
                  {fields.map((field) => (
                    <th key={field} className="text-left">
                      {field}
                    </th>
                  ))}
                  <th className="text-left">{t('import.errors')}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} data-testid={`import-row-${row.rowNumber}`}>
                    <td>{row.rowNumber}</td>
                    {fields.map((field) => (
                      <td key={field}>{row.values[field]}</td>
                    ))}
                    <td data-testid={`import-row-errors-${row.rowNumber}`}>
                      {row.errors
                        .map((error) => {
                          const [code, field] = error.split(':')
                          return field ? t(code ?? error, { field }) : t(error)
                        })
                        .join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!file || busy}
          onClick={() => void refreshPreview()}
          data-testid="import-dry-run"
        >
          {t('import.dryRun')}
        </Button>
        <Button
          type="button"
          disabled={!preview || preview.errorCount > 0 || busy}
          onClick={() => void doImport()}
          data-testid="import-commit"
        >
          {t('import.commit')}
        </Button>
      </div>
      <p role="status" data-testid="import-status" className="text-sm">
        {status}
      </p>
    </div>
  )
}
