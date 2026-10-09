import type { UploadAdapter } from "../types"

/** What `localAdapter` resolves with: the file itself, kept in the browser. */
export interface LocalUploadResult {
  id: string
  name: string
  size: number
  type: string
  file: File
  /** An object URL for previews. Valid until the page unloads. */
  url: string
}

export interface LocalAdapterOptions {
  /**
   * `memory` (default) keeps files for this page. `indexeddb` also saves
   * them in the browser so `getLocalFile(id)` works after a reload.
   */
  store?: "memory" | "indexeddb"
  /** IndexedDB database name. Default `uploadcn-files`. */
  dbName?: string
}

const STORE = "files"

function openDatabase(name: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact<T>(
  dbName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
) {
  const db = await openDatabase(dbName)
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

/**
 * Keeps files in the browser instead of sending them anywhere — for
 * UI-only use, offline drafts, or forms that submit the files themselves.
 * Every component works with it: progress completes instantly and the
 * result carries the `File`.
 */
export function localAdapter(
  options: LocalAdapterOptions = {}
): UploadAdapter<LocalUploadResult> {
  const dbName = options.dbName ?? "uploadcn-files"
  return {
    name: "local",
    resumable: false,
    async upload({ item, file, signal, onProgress }) {
      signal.throwIfAborted()
      if (options.store === "indexeddb") {
        await transact(dbName, "readwrite", (store) => store.put(file, item.id))
      }
      onProgress(file.size)
      return {
        id: item.id,
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        url: URL.createObjectURL(file),
      }
    },
    async abort({ item }) {
      if (options.store === "indexeddb")
        await deleteLocalFile(item.id, { dbName })
    },
  }
}

/** Reads a file saved by `localAdapter({ store: "indexeddb" })`. */
export async function getLocalFile(
  id: string,
  { dbName = "uploadcn-files" }: { dbName?: string } = {}
): Promise<File | null> {
  const file = await transact<File | undefined>(dbName, "readonly", (store) =>
    store.get(id)
  )
  return file ?? null
}

/** Deletes a file saved by `localAdapter({ store: "indexeddb" })`. */
export async function deleteLocalFile(
  id: string,
  { dbName = "uploadcn-files" }: { dbName?: string } = {}
): Promise<void> {
  await transact(dbName, "readwrite", (store) => store.delete(id))
}
