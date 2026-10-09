import type { UploadError } from "./errors"
import type { RetryOptions } from "./retry"
import type { ValidationIssue, ValidationOptions } from "./validation"

/**
 * Every state an upload can be in.
 *
 * ```text
 * validating ─► idle ─► queued ─► uploading ─► processing ─► scanning ─► success
 *     │                  ▲  │         │  │                      │
 *     ▼                  │  ▼         │  └──► error ──(retry)───┘──► rejected
 *  rejected          paused ◄─────────┘
 *                                cancelled
 * ```
 */
export type UploadStatus =
  | "idle"
  | "validating"
  | "queued"
  | "uploading"
  | "paused"
  | "processing"
  | "scanning"
  | "success"
  | "error"
  | "cancelled"
  | "rejected"

/** Why an upload is paused. */
export type PauseReason = "user" | "offline" | "restored"

export interface UploadProgress {
  /** Bytes sent so far. */
  readonly loaded: number
  /** Total bytes to send. */
  readonly total: number
  /** 0–100, rounded to one decimal. */
  readonly percent: number
  /** Bytes per second, averaged over a short window. `null` until measurable. */
  readonly speed: number | null
  /** Estimated seconds remaining. `null` until measurable. */
  readonly eta: number | null
}

export interface UploadChunks {
  readonly completed: number
  readonly total: number
}

export interface UploadItem<TResult = unknown> {
  readonly id: string
  /** Files added in the same `add()` call share a batch id. */
  readonly batchId: string
  /** The file that is (or will be) uploaded, after transforms. */
  readonly file: File
  /** The file as the user selected it, before transforms. */
  readonly originalFile: File
  readonly name: string
  readonly size: number
  readonly type: string
  readonly status: UploadStatus
  readonly progress: UploadProgress
  readonly error: UploadError | null
  /** Validation issues for `rejected` items. */
  readonly issues: readonly ValidationIssue[]
  /** Attempts made in the current run, reset by a manual retry. */
  readonly attempts: number
  /** Timestamp of the next automatic retry, if one is scheduled. */
  readonly retryAt: number | null
  readonly pauseReason: PauseReason | null
  /** Value returned by the adapter (and `process`). */
  readonly result: TResult | undefined
  readonly meta: Readonly<Record<string, unknown>>
  /** Chunk progress for multipart / chunked adapters. */
  readonly chunks: UploadChunks | null
  /** Adapter-owned, JSON-serializable state used to resume the upload. */
  readonly resumeState: unknown
  /** `true` when the item was restored from persistence after a reload. */
  readonly restored: boolean
  readonly createdAt: number
  readonly startedAt: number | null
  readonly completedAt: number | null
}

export interface UploadAdapterContext {
  readonly item: UploadItem
  readonly file: File
  readonly signal: AbortSignal
  /** 1-based attempt number within the current run. */
  readonly attempt: number
  /** State previously saved with {@link saveResumeState}, if any. */
  readonly resumeState: unknown
  /** Report progress. `total` defaults to the file size. */
  onProgress(loaded: number, total?: number): void
  /** Report chunk progress for chunked uploads. */
  onChunkProgress(completed: number, total: number): void
  /** Persist adapter state so an interrupted upload can resume. */
  saveResumeState(state: unknown): void
}

export interface UploadAdapterAbortContext {
  readonly item: UploadItem
  readonly resumeState: unknown
}

/**
 * Moves bytes somewhere. Adapters are plain objects, so writing one for a new
 * backend (Supabase, Firebase, Azure, GCS…) is a single function.
 */
export interface UploadAdapter<TResult = unknown> {
  readonly name: string
  /**
   * Whether an interrupted upload can continue where it left off. Pausing is
   * only offered for resumable uploads.
   */
  readonly resumable?: boolean | ((file: File) => boolean)
  upload(context: UploadAdapterContext): Promise<TResult>
  /** Cleans up server-side state (e.g. aborts a multipart upload). */
  abort?(context: UploadAdapterAbortContext): Promise<void>
}

export type ResultOf<TAdapter> =
  TAdapter extends UploadAdapter<infer TResult> ? TResult : never

export interface ProcessContext<TResult> {
  readonly signal: AbortSignal
  /** Move the item between server-side states while processing. */
  setStatus(status: "processing" | "scanning"): void
  setMeta(meta: Record<string, unknown>): void
  readonly result: TResult
}

/** Lets the application drive server-side states (processing, scanning…). */
export interface UploadItemUpdate<TResult> {
  status?: "processing" | "scanning" | "success" | "error" | "rejected"
  result?: TResult
  error?: UploadError | string
  meta?: Record<string, unknown>
}

export type DuplicateStrategy = "reject" | "allow" | "replace"

export interface NetworkMonitor {
  isOnline(): boolean
  subscribe(listener: (online: boolean) => void): () => void
}

export interface PersistedUpload {
  readonly id: string
  readonly batchId: string
  readonly file: File
  readonly originalFile: File
  readonly meta: Record<string, unknown>
  readonly resumeState: unknown
  readonly adapter: string
  readonly createdAt: number
}

/** Storage for uploads that should survive a page reload. */
export interface UploadPersistence {
  load(): Promise<PersistedUpload[]>
  save(record: PersistedUpload): Promise<void>
  remove(id: string): Promise<void>
}

export interface UploaderOptions<TResult = unknown> extends ValidationOptions {
  adapter: UploadAdapter<TResult>
  /** Start uploading as soon as files are added. Default `true`. */
  autoUpload?: boolean
  /** Maximum simultaneous uploads. Default `3`. */
  concurrency?: number
  /** Automatic retry policy, or `false` to disable. */
  retry?: RetryOptions | false
  /** How to treat a file that is already in the queue. Default `"reject"`. */
  duplicates?: DuplicateStrategy
  /** Transform files before they are queued (compression, resizing, …). */
  transform?: (
    file: File,
    context: { signal: AbortSignal }
  ) => File | Blob | Promise<File | Blob>
  /**
   * Runs after the bytes are stored: finalize metadata, wait for a virus scan,
   * kick off processing. Throw an `UploadError` with code `"rejected"` to reject.
   */
  process?: (
    item: UploadItem<TResult>,
    context: ProcessContext<TResult>
  ) => Promise<TResult | void>
  /** Keep uploads across reloads (see `createIndexedDBPersistence`). */
  persistence?: UploadPersistence
  /** Network status source. Defaults to `navigator.onLine` in browsers. */
  network?: NetworkMonitor | false
  /** Minimum milliseconds between progress state updates. Default `100`. */
  progressInterval?: number
}

export interface AddOptions {
  meta?: Record<string, unknown>
  /** Override `autoUpload` for this batch. */
  start?: boolean
}

export interface UploaderState<TResult = unknown> {
  readonly items: readonly UploadItem<TResult>[]
  readonly online: boolean
}

export interface UploaderEvents<TResult = unknown> {
  add: { items: UploadItem<TResult>[] }
  reject: { item: UploadItem<TResult> }
  start: { item: UploadItem<TResult> }
  progress: { item: UploadItem<TResult> }
  pause: { item: UploadItem<TResult> }
  resume: { item: UploadItem<TResult> }
  retry: { item: UploadItem<TResult>; error: UploadError; delay: number }
  success: { item: UploadItem<TResult> }
  error: { item: UploadItem<TResult>; error: UploadError }
  cancel: { item: UploadItem<TResult> }
  remove: { item: UploadItem<TResult> }
  statuschange: { item: UploadItem<TResult>; previous: UploadStatus }
  /** Fired when the queue drains after at least one upload finished. */
  complete: { items: UploadItem<TResult>[] }
  online: { online: boolean }
}

export type UploaderEventName = keyof UploaderEvents

export type ItemSelector =
  string | readonly string[] | ((item: UploadItem) => boolean)

export interface Uploader<TResult = unknown> {
  getState(): UploaderState<TResult>
  subscribe(listener: () => void): () => void
  on<TEvent extends keyof UploaderEvents<TResult>>(
    event: TEvent,
    handler: (payload: UploaderEvents<TResult>[TEvent]) => void
  ): () => void
  /** Validates, transforms and enqueues files. Resolves with the new items. */
  add(
    files: Iterable<File> | ArrayLike<File>,
    options?: AddOptions
  ): Promise<UploadItem<TResult>[]>
  /** Queues idle items. Without arguments, queues every idle item. */
  start(selector?: ItemSelector): void
  pause(selector?: ItemSelector): void
  resume(selector?: ItemSelector): void
  cancel(selector?: ItemSelector): void
  retry(selector?: ItemSelector): void
  remove(selector?: ItemSelector): void
  /** Removes finished items (success, cancelled, rejected). */
  clearCompleted(): void
  /** Drives server-side states from the application (webhooks, polling…). */
  update(id: string, update: UploadItemUpdate<TResult>): void
  getItem(id: string): UploadItem<TResult> | undefined
  /** Whether the item can be paused (resumable adapter + active state). */
  canPause(item: UploadItem<TResult>): boolean
  /** Loads persisted uploads back into the queue (paused). */
  restore(): Promise<UploadItem<TResult>[]>
  setOptions(options: Partial<UploaderOptions<TResult>>): void
  getOptions(): Readonly<UploaderOptions<TResult>>
  /**
   * Attaches environment listeners (network status) and returns a cleanup.
   * Once every mount is released the engine suspends and re-queues in-flight
   * work, so React Strict Mode's double mount is safe.
   */
  mount(): () => void
  /** Aborts everything and releases resources. The uploader can't be reused. */
  destroy(): void
}
