import type { PersistedUpload, UploadPersistence } from "./types"

export interface IndexedDBPersistenceOptions {
  /** Database name. Default `uploadcn`. */
  name?: string
  /** Object store name. Default `uploads`. */
  store?: string
  /** Drop records older than this many milliseconds. Default 7 days. */
  maxAge?: number
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Persists queued uploads — including the file bytes — in IndexedDB so they
 * survive reloads, crashes and closed tabs. Combined with a resumable
 * adapter, uploads continue from the last finished chunk.
 *
 * Browsers may evict IndexedDB data under storage pressure; call
 * `navigator.storage.persist()` to request durable storage.
 */
export function createIndexedDBPersistence(
  options: IndexedDBPersistenceOptions = {}
): UploadPersistence {
  const name = options.name ?? "uploadcn"
  const storeName = options.store ?? "uploads"
  const maxAge = options.maxAge ?? 7 * 24 * 60 * 60 * 1000
  let database: Promise<IDBDatabase> | null = null

  function open(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
      return Promise.reject(new Error("IndexedDB is not available"))
    }
    database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) {
          request.result.createObjectStore(storeName, { keyPath: "id" })
        }
      }
      request.onsuccess = () => {
        const db = request.result
        // Let other tabs upgrade the schema without blocking.
        db.onversionchange = () => {
          db.close()
          database = null
        }
        resolve(db)
      }
      request.onerror = () => {
        database = null
        reject(request.error)
      }
    })
    return database
  }

  async function withStore<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await open()
    const transaction = db.transaction(storeName, mode)
    const committed = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    const result = await promisify(fn(transaction.objectStore(storeName)))
    await committed
    return result
  }

  return {
    async load() {
      const records = await withStore<PersistedUpload[]>("readonly", (store) =>
        store.getAll()
      )
      const cutoff = Date.now() - maxAge
      const fresh: PersistedUpload[] = []
      for (const record of records) {
        if (record.createdAt < cutoff) {
          await withStore("readwrite", (store) => store.delete(record.id))
        } else {
          fresh.push(record)
        }
      }
      return fresh.sort((a, b) => a.createdAt - b.createdAt)
    },
    async save(record) {
      await withStore("readwrite", (store) => store.put(record))
    },
    async remove(id) {
      await withStore("readwrite", (store) => store.delete(id))
    },
  }
}

/** An in-memory persistence, useful for tests and server rendering. */
export function createMemoryPersistence(): UploadPersistence & {
  records: Map<string, PersistedUpload>
} {
  const records = new Map<string, PersistedUpload>()
  return {
    records,
    load: async () =>
      [...records.values()].sort((a, b) => a.createdAt - b.createdAt),
    save: async (record) => {
      records.set(record.id, record)
    },
    remove: async (id) => {
      records.delete(id)
    },
  }
}

export interface BackgroundCapabilities {
  /** IndexedDB can store files, so uploads survive reloads. */
  persistence: boolean
  /** `navigator.storage.persist()` is available to resist eviction. */
  persistentStorage: boolean
  /** Web Locks coordinate uploads across tabs. */
  webLocks: boolean
  /**
   * The Background Fetch API (Chromium only) can continue a fetch after the
   * page closes, but requires a service worker and a single request body.
   */
  backgroundFetch: boolean
}

/** Detects which background/persistence features this browser supports. */
export function getBackgroundCapabilities(): BackgroundCapabilities {
  const hasNavigator = typeof navigator !== "undefined"
  return {
    persistence: typeof indexedDB !== "undefined",
    persistentStorage:
      hasNavigator && typeof navigator.storage?.persist === "function",
    webLocks: hasNavigator && "locks" in navigator,
    backgroundFetch:
      typeof self !== "undefined" &&
      "ServiceWorkerRegistration" in self &&
      "backgroundFetch" in ServiceWorkerRegistration.prototype,
  }
}

/** Asks the browser not to evict persisted uploads. Resolves to the outcome. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return false
  }
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
