/**
 * Portable file export/import for the whole database (T-033; TAD.md §13, PLAN.md P1-4).
 *
 * Export writes the raw SQLite bytes, optionally wrapped by the AES-GCM codec, using
 * `showSaveFilePicker` where available and an anchor download otherwise. Import reads a file,
 * optionally decrypts it, then reuses the exact T-032 restore path (validate → pre-restore
 * snapshot → import) so there is one source of truth for safety.
 */
import type { Db } from '../db/types'
import { decryptBackup, encryptBackup, type WebCrypto } from './crypto'
import { restoreFromSnapshot, type RestoreSummary } from './restore'
import type { SnapshotStorage } from './storage'
import { importAsSnapshot, schemaVersion } from './snapshots'

export interface ExportOptions {
  bytes: Uint8Array
  fileName: string
  passphrase?: string
  schemaVersion: number
  crypto: WebCrypto
  /** Injected for tests; defaults to a browser download / file picker. */
  writer?: FileWriter
}

export interface FileWriter {
  save(bytes: Uint8Array, fileName: string): Promise<void>
}

/** A download-first writer used when the File System Access API is unavailable. */
export function downloadWriter(): FileWriter {
  return {
    async save(bytes, fileName) {
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      try {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = fileName
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      } finally {
        URL.revokeObjectURL(url)
      }
    },
  }
}

/** Uses showSaveFilePicker when the browser supports it, else a normal download. */
export function nativeOrDownloadWriter(): FileWriter {
  const picker = (
    globalThis as typeof globalThis & {
      showSaveFilePicker?: (options: {
        suggestedName: string
        types: { description: string; accept: Record<string, string[]> }[]
      }) => Promise<{ createWritable(): Promise<FileSystemWritableFileStream> }>
    }
  ).showSaveFilePicker

  return {
    async save(bytes, fileName) {
      if (typeof picker === 'function') {
        const handle = await picker({
          suggestedName: fileName,
          types: [
            {
              description: 'Coaching Manager backup',
              accept: { 'application/octet-stream': ['.sqlite', '.cmb'] },
            },
          ],
        })
        const writable = await handle.createWritable()
        await writable.write(new Uint8Array(bytes))
        await writable.close()
        return
      }
      await downloadWriter().save(bytes, fileName)
    },
  }
}

export async function exportDatabaseFile(options: ExportOptions): Promise<void> {
  const { bytes, fileName, passphrase, schemaVersion: version, crypto, writer } = options
  const output = passphrase
    ? await encryptBackup(bytes, passphrase, version, crypto)
    : new Uint8Array(bytes)
  await (writer ?? nativeOrDownloadWriter()).save(output, fileName)
}

export interface ImportOptions {
  file: Uint8Array
  db: Db
  storage: SnapshotStorage
  appSchemaVersion: number
  now: number
  passphrase?: string
  crypto: WebCrypto
}

export async function importDatabaseFile(options: ImportOptions): Promise<RestoreSummary> {
  const { file, db, storage, appSchemaVersion, now, passphrase, crypto } = options

  let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(file)
  if (passphrase) {
    const decrypted = await decryptBackup(file, passphrase, crypto)
    if (decrypted.meta.schemaVersion > appSchemaVersion) {
      throw new Error('backup schema version is newer than this app')
    }
    bytes = decrypted.plain
  }

  // Register the bytes as a snapshot so restore's checksum + header + schema validation, forced
  // pre-restore snapshot and rollback all apply unchanged.
  const importedName = `import-${now}.sqlite`
  await importAsSnapshot(storage, bytes, db, importedName, now)
  return restoreFromSnapshot({ db, storage, file: importedName, appSchemaVersion, now })
}

/** Compute the current schema version for export metadata. */
export async function exportSchemaVersion(db: Db): Promise<number> {
  return schemaVersion(db)
}
