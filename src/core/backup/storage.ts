/**
 * Snapshot file storage (T-031, D-035 A1).
 *
 * A four-method seam keeps snapshot logic testable without a browser and leaves the locked Db
 * worker RPC surface untouched. The production adapter stores files in a dedicated OPFS folder.
 */
/** `entries()` is standard OPFS but absent from the current DOM lib typings. */
type DirectoryHandleWithEntries = FileSystemDirectoryHandle & {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
}

export interface SnapshotStorage {
  list(): Promise<string[]>
  read(name: string): Promise<Uint8Array>
  write(name: string, bytes: Uint8Array): Promise<void>
  remove(name: string): Promise<void>
}

export function opfsStorage(directory = 'backups'): SnapshotStorage {
  async function folder(): Promise<FileSystemDirectoryHandle> {
    const root = await navigator.storage.getDirectory()
    return root.getDirectoryHandle(directory, { create: true })
  }

  return {
    async list() {
      const handle = (await folder()) as DirectoryHandleWithEntries
      const names: string[] = []
      for await (const [name] of handle.entries()) names.push(name)
      return names
    },

    async read(name) {
      const file = await (await folder()).getFileHandle(name)
      return new Uint8Array(await (await file.getFile()).arrayBuffer())
    },

    async write(name, bytes) {
      const file = await (await folder()).getFileHandle(name, { create: true })
      const writable = await file.createWritable()
      await writable.write(new Uint8Array(bytes))
      await writable.close()
    },

    async remove(name) {
      await (await folder()).removeEntry(name)
    },
  }
}
