import { Emitter } from "./emitter"
import { UploadError, toUploadError } from "./errors"
import { createBrowserNetworkMonitor } from "./network"
import { getRetryDelay, resolveRetryOptions } from "./retry"
import { SpeedTracker, estimateEta } from "./speed"
import type {
  AddOptions,
  ItemSelector,
  NetworkMonitor,
  PersistedUpload,
  UploadAdapter,
  UploadAdapterContext,
  UploadItem,
  UploadItemUpdate,
  UploadProgress,
  UploadStatus,
  Uploader,
  UploaderEvents,
  UploaderOptions,
  UploaderState,
} from "./types"
import { createId, getFileFingerprint, toArray, toFile } from "./utils"
import { type ValidationIssue, validateFile } from "./validation"

type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type ItemPatch<TResult> = Partial<Mutable<UploadItem<TResult>>>

type AbortReason = "pause" | "cancel" | "remove" | "unmount" | "destroy"

interface Runtime {
  controller: AbortController
  abortReason: AbortReason | null
  phase: "upload" | "process"
  speed: SpeedTracker
  lastCommit: number
  trailing: ReturnType<typeof setTimeout> | null
  releaseLock: (() => void) | null
}

/** Statuses in which the engine is still working on an item. */
const ACTIVE_STATUSES: ReadonlySet<UploadStatus> = new Set([
  "validating",
  "queued",
  "uploading",
  "processing",
  "scanning",
])

/** Statuses that end an item's lifecycle. */
const FINISHED_STATUSES: ReadonlySet<UploadStatus> = new Set([
  "success",
  "cancelled",
  "rejected",
])

const LOCK_PREFIX = "uploadcn:"

export function isActiveStatus(status: UploadStatus) {
  return ACTIVE_STATUSES.has(status)
}

export function isFinishedStatus(status: UploadStatus) {
  return FINISHED_STATUSES.has(status)
}

function createProgress(
  loaded: number,
  total: number,
  speed: number | null = null
): UploadProgress {
  const safeTotal = Math.max(total, 0)
  const clamped = Math.min(Math.max(loaded, 0), safeTotal)
  const percent =
    safeTotal === 0 ? 0 : Math.round((clamped / safeTotal) * 1000) / 10
  return {
    loaded: clamped,
    total: safeTotal,
    percent,
    speed,
    eta: estimateEta(clamped, safeTotal, speed),
  }
}

function getLocks(): LockManager | null {
  return typeof navigator !== "undefined" && "locks" in navigator
    ? navigator.locks
    : null
}

async function mapWithConcurrency<T>(
  values: readonly T[],
  limit: number,
  fn: (value: T) => Promise<void>
) {
  let index = 0
  const workers = Array.from(
    { length: Math.min(limit, values.length) },
    async () => {
      while (index < values.length) {
        await fn(values[index++]!)
      }
    }
  )
  await Promise.all(workers)
}

/**
 * Creates an upload engine. It is framework-agnostic: React bindings live in
 * `@uploadcn/react`, but the engine works anywhere `File` exists.
 *
 * @example
 * const uploader = createUploader({ adapter: httpAdapter({ url: "/api/upload" }) })
 * uploader.on("success", ({ item }) => console.log(item.result))
 * await uploader.add(input.files)
 */
export function createUploader<TResult = unknown>(
  initialOptions: UploaderOptions<TResult>
): Uploader<TResult> {
  let options: UploaderOptions<TResult> = { ...initialOptions }
  let retry = resolveRetryOptions(options.retry)

  const emitter = new Emitter<UploaderEvents<TResult>>()
  const listeners = new Set<() => void>()
  const items = new Map<string, UploadItem<TResult>>()
  const runtimes = new Map<string, Runtime>()
  const preparing = new Map<string, AbortController>()
  const persistTimers = new Map<string, ReturnType<typeof setTimeout>>()

  let state: UploaderState<TResult> = { items: [], online: true }
  let pendingEvents: (() => void)[] = []
  let depth = 0
  let dirty = false
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let hadActivity = false
  let destroyed = false
  let mounts = 0
  let suspended = false
  let unsubscribeNetwork: (() => void) | null = null

  // ── state ─────────────────────────────────────────────────────────────────

  function transaction<T>(fn: () => T): T {
    depth++
    try {
      return fn()
    } finally {
      depth--
      if (depth === 0) flush()
    }
  }

  function flush() {
    if (dirty) {
      dirty = false
      state = { ...state, items: [...items.values()] }
      for (const listener of [...listeners]) listener()
    }
    const events = pendingEvents
    pendingEvents = []
    for (const emit of events) emit()
  }

  function emit<TEvent extends keyof UploaderEvents<TResult>>(
    event: TEvent,
    payload: UploaderEvents<TResult>[TEvent]
  ) {
    pendingEvents.push(() => emitter.emit(event, payload))
  }

  function patch(id: string, changes: ItemPatch<TResult>) {
    const previous = items.get(id)
    if (!previous) return undefined
    const next = { ...previous, ...changes } as UploadItem<TResult>
    items.set(id, next)
    dirty = true
    if (changes.status && changes.status !== previous.status) {
      emit("statuschange", { item: next, previous: previous.status })
    }
    return next
  }

  function select(selector?: ItemSelector): UploadItem<TResult>[] {
    if (selector === undefined) return [...items.values()]
    if (typeof selector === "string") {
      const item = items.get(selector)
      return item ? [item] : []
    }
    if (typeof selector === "function") {
      return [...items.values()].filter(selector)
    }
    return selector.flatMap((id) => {
      const item = items.get(id)
      return item ? [item] : []
    })
  }

  function isResumable(file: File) {
    const { resumable } = options.adapter
    return typeof resumable === "function" ? resumable(file) : !!resumable
  }

  function canPause(item: UploadItem<TResult>) {
    if (item.status === "queued") return true
    return item.status === "uploading" && isResumable(item.file)
  }

  // ── persistence ───────────────────────────────────────────────────────────

  function toRecord(item: UploadItem<TResult>): PersistedUpload {
    return {
      id: item.id,
      batchId: item.batchId,
      file: item.file,
      originalFile: item.originalFile,
      meta: { ...item.meta, __loaded: item.progress.loaded },
      resumeState: item.resumeState,
      adapter: options.adapter.name,
      createdAt: item.createdAt,
    }
  }

  function persist(id: string, debounce = 0) {
    const { persistence } = options
    if (!persistence) return
    const existing = persistTimers.get(id)
    if (existing) clearTimeout(existing)
    const write = () => {
      persistTimers.delete(id)
      const item = items.get(id)
      if (!item || isFinishedStatus(item.status)) return
      persistence.save(toRecord(item)).catch(() => {
        // Quota or private-mode failures must not break uploading.
      })
    }
    if (debounce > 0) persistTimers.set(id, setTimeout(write, debounce))
    else write()
  }

  function unpersist(id: string) {
    const timer = persistTimers.get(id)
    if (timer) clearTimeout(timer)
    persistTimers.delete(id)
    options.persistence?.remove(id).catch(() => {})
  }

  /** Holds a Web Lock while uploading so other tabs don't resume the same file. */
  function acquireLock(id: string): (() => void) | null {
    const locks = getLocks()
    if (!locks || !options.persistence) return null
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    locks.request(`${LOCK_PREFIX}${id}`, () => held).catch(() => {})
    return release
  }

  async function getLockedIds(): Promise<Set<string>> {
    const locks = getLocks()
    if (!locks) return new Set()
    try {
      const snapshot = await locks.query()
      return new Set(
        (snapshot.held ?? [])
          .map((lock) => lock.name ?? "")
          .filter((name) => name.startsWith(LOCK_PREFIX))
          .map((name) => name.slice(LOCK_PREFIX.length))
      )
    } catch {
      return new Set()
    }
  }

  // ── scheduling ────────────────────────────────────────────────────────────

  function activeUploads() {
    let count = 0
    for (const runtime of runtimes.values()) {
      if (runtime.phase === "upload") count++
    }
    return count
  }

  function schedule() {
    if (destroyed || suspended || !state.online) return
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
    const limit = Math.max(1, options.concurrency ?? 3)
    const now = Date.now()
    let active = activeUploads()
    let nextRetryAt = Infinity
    for (const item of items.values()) {
      if (active >= limit) break
      if (item.status !== "queued" || runtimes.has(item.id)) continue
      if (item.retryAt && item.retryAt > now) {
        nextRetryAt = Math.min(nextRetryAt, item.retryAt)
        continue
      }
      active++
      void run(item)
    }
    if (Number.isFinite(nextRetryAt)) {
      retryTimer = setTimeout(
        () => transaction(schedule),
        Math.max(0, nextRetryAt - now)
      )
    }
  }

  function checkComplete() {
    if (!hadActivity) return
    for (const item of items.values()) {
      if (isActiveStatus(item.status)) return
    }
    hadActivity = false
    emit("complete", { items: [...items.values()] })
  }

  // ── running ───────────────────────────────────────────────────────────────

  function commitProgress(
    id: string,
    runtime: Runtime,
    loaded: number,
    total: number
  ) {
    if (runtime.trailing) {
      clearTimeout(runtime.trailing)
      runtime.trailing = null
    }
    runtime.lastCommit = Date.now()
    transaction(() => {
      const speed = runtime.speed.sample(loaded, runtime.lastCommit)
      const item = patch(id, { progress: createProgress(loaded, total, speed) })
      if (item) emit("progress", { item })
    })
  }

  async function run(initial: UploadItem<TResult>) {
    const id = initial.id
    const adapter: UploadAdapter<TResult> = options.adapter
    const runtime: Runtime = {
      controller: new AbortController(),
      abortReason: null,
      phase: "upload",
      speed: new SpeedTracker(),
      lastCommit: 0,
      trailing: null,
      releaseLock: acquireLock(id),
    }
    runtimes.set(id, runtime)
    hadActivity = true
    const { signal } = runtime.controller
    const attempt = initial.attempts + 1

    const started = transaction(() => {
      const item = patch(id, {
        status: "uploading",
        attempts: attempt,
        retryAt: null,
        error: null,
        pauseReason: null,
        startedAt: initial.startedAt ?? Date.now(),
        progress: createProgress(initial.progress.loaded, initial.size),
      })
      if (item) emit("start", { item })
      return item
    })
    if (!started) {
      runtimes.delete(id)
      return
    }

    const context: UploadAdapterContext = {
      item: started as UploadItem,
      file: started.file,
      signal,
      attempt,
      resumeState: started.resumeState,
      onProgress(loaded, total = started.size) {
        if (signal.aborted) return
        const interval = options.progressInterval ?? 100
        const elapsed = Date.now() - runtime.lastCommit
        if (elapsed >= interval || loaded >= total) {
          commitProgress(id, runtime, loaded, total)
        } else if (!runtime.trailing) {
          runtime.trailing = setTimeout(() => {
            runtime.trailing = null
            if (!signal.aborted) commitProgress(id, runtime, loaded, total)
          }, interval - elapsed)
        }
      },
      onChunkProgress(completed, total) {
        if (signal.aborted) return
        transaction(() => patch(id, { chunks: { completed, total } }))
      },
      saveResumeState(resumeState) {
        if (signal.aborted && runtime.abortReason !== "pause") return
        transaction(() => patch(id, { resumeState }))
        persist(id, 250)
      },
    }

    try {
      let result = await adapter.upload(context)
      if (
        runtime.abortReason === "cancel" ||
        runtime.abortReason === "remove"
      ) {
        return
      }
      runtime.phase = "process"
      if (runtime.trailing) clearTimeout(runtime.trailing)
      transaction(() => {
        patch(id, {
          result,
          ...(options.process ? { status: "processing" as const } : {}),
          progress: createProgress(started.size, started.size),
          resumeState: null,
          pauseReason: null,
        })
        schedule()
      })

      if (options.process) {
        const item = items.get(id)
        if (!item) return
        const processed = await options.process(item, {
          signal,
          result,
          setStatus(status) {
            if (!signal.aborted) transaction(() => patch(id, { status }))
          },
          setMeta(meta) {
            if (signal.aborted) return
            transaction(() => {
              const current = items.get(id)
              if (current) patch(id, { meta: { ...current.meta, ...meta } })
            })
          },
        })
        if (signal.aborted) return
        if (processed !== undefined) result = processed
      }

      transaction(() => {
        const item = patch(id, {
          status: "success",
          result,
          error: null,
          completedAt: Date.now(),
          retryAt: null,
        })
        if (item) emit("success", { item })
      })
      unpersist(id)
    } catch (thrown) {
      if (runtime.abortReason) return
      const error = toUploadError(thrown)
      transaction(() => {
        if (error.code === "rejected") {
          const item = patch(id, { status: "rejected", error })
          if (item) emit("error", { item, error })
          unpersist(id)
          return
        }
        const isConnectivity =
          error.code === "network" || error.code === "timeout"
        if (isConnectivity && !state.online) {
          // Don't burn retries while offline; resume when the network returns.
          const item = patch(id, {
            status: "paused",
            pauseReason: "offline",
            attempts: attempt - 1,
            error,
          })
          if (item) emit("pause", { item })
          return
        }
        if (
          runtime.phase === "upload" &&
          error.retryable &&
          attempt <= retry.retries
        ) {
          const delay = Math.max(
            error.retryAfter ?? 0,
            getRetryDelay(attempt, retry)
          )
          const item = patch(id, {
            status: "queued",
            retryAt: Date.now() + delay,
            error,
          })
          if (item) emit("retry", { item, error, delay })
          return
        }
        const item = patch(id, { status: "error", error })
        if (item) emit("error", { item, error })
      })
    } finally {
      if (runtime.trailing) clearTimeout(runtime.trailing)
      runtime.releaseLock?.()
      if (runtimes.get(id) === runtime) runtimes.delete(id)
      transaction(() => {
        schedule()
        checkComplete()
      })
    }
  }

  function stop(id: string, reason: AbortReason) {
    const runtime = runtimes.get(id)
    if (runtime) {
      runtime.abortReason = reason
      runtime.controller.abort(reason)
      if (runtime.trailing) clearTimeout(runtime.trailing)
      runtime.releaseLock?.()
      runtimes.delete(id)
    }
    const preparation = preparing.get(id)
    if (preparation) {
      preparation.abort(reason)
      preparing.delete(id)
    }
  }

  function cleanupRemote(item: UploadItem<TResult>) {
    const { adapter } = options
    if (adapter.abort && item.resumeState != null) {
      adapter
        .abort({ item: item as UploadItem, resumeState: item.resumeState })
        .catch(() => {})
    }
  }

  // ── adding ────────────────────────────────────────────────────────────────

  function createItem(
    file: File,
    batchId: string,
    meta: Record<string, unknown>
  ): UploadItem<TResult> {
    return {
      id: createId(),
      batchId,
      file,
      originalFile: file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "validating",
      progress: createProgress(0, file.size),
      error: null,
      issues: [],
      attempts: 0,
      retryAt: null,
      pauseReason: null,
      result: undefined,
      meta,
      chunks: null,
      resumeState: null,
      restored: false,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
    }
  }

  function reject(id: string, issues: ValidationIssue[]) {
    const error = new UploadError(issues[0]?.message ?? "File rejected", {
      code: "validation",
      details: issues,
    })
    const item = patch(id, { status: "rejected", issues, error })
    if (item) emit("reject", { item })
  }

  /** Counts items that occupy a slot towards `maxFiles`. */
  function countSlots(exclude: ReadonlySet<string>) {
    let count = 0
    for (const item of items.values()) {
      if (exclude.has(item.id)) continue
      if (item.status !== "rejected" && item.status !== "cancelled") count++
    }
    return count
  }

  async function add(
    input: Iterable<File> | ArrayLike<File>,
    addOptions: AddOptions = {}
  ): Promise<UploadItem<TResult>[]> {
    if (destroyed) return []
    const files = toArray(input)
    if (files.length === 0) return []
    const batchId = createId()
    const autoStart = addOptions.start ?? options.autoUpload ?? true
    const created = files.map((file) =>
      createItem(file, batchId, { ...addOptions.meta })
    )
    const newIds = new Set(created.map((item) => item.id))
    const candidates: UploadItem<TResult>[] = []

    transaction(() => {
      for (const item of created) items.set(item.id, item)
      dirty = true
      emit("add", { items: created })

      // Synchronous, order-dependent checks: duplicates and maxFiles.
      const strategy = options.duplicates ?? "reject"
      const fingerprints = new Map<string, string>()
      for (const item of items.values()) {
        if (
          newIds.has(item.id) ||
          item.status === "rejected" ||
          item.status === "cancelled"
        ) {
          continue
        }
        fingerprints.set(getFileFingerprint(item.originalFile), item.id)
      }
      let slots = countSlots(newIds)
      for (const item of created) {
        const fingerprint = getFileFingerprint(item.file)
        const existing = fingerprints.get(fingerprint)
        if (existing && strategy === "reject") {
          reject(item.id, [
            { code: "duplicate", message: "This file has already been added" },
          ])
          continue
        }
        if (existing && strategy === "replace") {
          removeItem(existing)
          slots--
        }
        if (options.maxFiles != null && slots >= options.maxFiles) {
          reject(item.id, [
            {
              code: "too-many-files",
              message: `You can add up to ${options.maxFiles} file${options.maxFiles === 1 ? "" : "s"}`,
            },
          ])
          continue
        }
        slots++
        fingerprints.set(fingerprint, item.id)
        candidates.push(item)
      }
    })

    await mapWithConcurrency(candidates, 4, (item) => prepare(item, autoStart))
    transaction(schedule)
    return created.flatMap((item) => {
      const current = items.get(item.id)
      return current ? [current] : []
    })
  }

  async function prepare(item: UploadItem<TResult>, autoStart: boolean) {
    const controller = new AbortController()
    preparing.set(item.id, controller)
    try {
      const issues = await validateFile(item.file, options, {
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      if (issues.length) {
        transaction(() => reject(item.id, issues))
        return
      }
      let file = item.file
      if (options.transform) {
        file = toFile(
          await options.transform(item.file, { signal: controller.signal }),
          item.file
        )
        if (controller.signal.aborted) return
      }
      transaction(() => {
        patch(item.id, {
          file,
          size: file.size,
          type: file.type,
          progress: createProgress(0, file.size),
          status: autoStart ? "queued" : "idle",
        })
      })
      persist(item.id)
    } catch (thrown) {
      if (controller.signal.aborted) return
      const error = toUploadError(thrown)
      transaction(() => {
        const updated = patch(item.id, { status: "error", error })
        if (updated) emit("error", { item: updated, error })
      })
    } finally {
      if (preparing.get(item.id) === controller) preparing.delete(item.id)
    }
  }

  // ── actions ───────────────────────────────────────────────────────────────

  function removeItem(id: string) {
    const item = items.get(id)
    if (!item) return
    stop(id, "remove")
    if (item.status !== "success") cleanupRemote(item)
    items.delete(id)
    dirty = true
    unpersist(id)
    emit("remove", { item })
  }

  function start(selector?: ItemSelector) {
    transaction(() => {
      for (const item of select(selector)) {
        if (item.status === "idle") patch(item.id, { status: "queued" })
      }
      schedule()
    })
  }

  function pause(selector?: ItemSelector) {
    transaction(() => {
      for (const item of select(selector)) {
        if (!canPause(item)) continue
        stop(item.id, "pause")
        const updated = patch(item.id, {
          status: "paused",
          pauseReason: "user",
          retryAt: null,
          progress: { ...item.progress, speed: null, eta: null },
        })
        if (updated) emit("pause", { item: updated })
        persist(item.id)
      }
      schedule()
      checkComplete()
    })
  }

  function resume(selector?: ItemSelector) {
    transaction(() => {
      for (const item of select(selector)) {
        if (item.status !== "paused") continue
        const updated = patch(item.id, {
          status: "queued",
          pauseReason: null,
          retryAt: null,
        })
        if (updated) emit("resume", { item: updated })
      }
      schedule()
    })
  }

  function cancel(selector?: ItemSelector) {
    transaction(() => {
      for (const item of select(selector)) {
        if (isFinishedStatus(item.status)) continue
        stop(item.id, "cancel")
        cleanupRemote(item)
        const updated = patch(item.id, {
          status: "cancelled",
          retryAt: null,
          resumeState: null,
          chunks: null,
          progress: createProgress(0, item.size),
        })
        if (updated) emit("cancel", { item: updated })
        unpersist(item.id)
      }
      schedule()
      checkComplete()
    })
  }

  function retryItems(selector?: ItemSelector) {
    transaction(() => {
      for (const item of select(selector)) {
        if (item.status !== "error" && item.status !== "cancelled") continue
        patch(item.id, {
          status: "queued",
          attempts: 0,
          retryAt: null,
          error: null,
          completedAt: null,
        })
        persist(item.id)
      }
      schedule()
    })
  }

  function remove(selector?: ItemSelector) {
    transaction(() => {
      for (const item of select(selector)) removeItem(item.id)
      schedule()
      checkComplete()
    })
  }

  function clearCompleted() {
    remove((item) => isFinishedStatus(item.status))
  }

  function update(id: string, changes: UploadItemUpdate<TResult>) {
    transaction(() => {
      const current = items.get(id)
      if (!current) return
      const meta = changes.meta
        ? { ...current.meta, ...changes.meta }
        : undefined
      const error =
        typeof changes.error === "string"
          ? new UploadError(changes.error, {
              code: changes.status === "rejected" ? "rejected" : "unknown",
            })
          : changes.error
      const item = patch(id, {
        ...(changes.status ? { status: changes.status } : {}),
        ...(changes.result !== undefined ? { result: changes.result } : {}),
        ...(meta ? { meta } : {}),
        ...(error ? { error } : {}),
        ...(changes.status === "success"
          ? { completedAt: Date.now(), error: null }
          : {}),
      })
      if (!item) return
      if (changes.status === "success") emit("success", { item })
      if (
        (changes.status === "error" || changes.status === "rejected") &&
        item.error
      ) {
        emit("error", { item, error: item.error })
      }
      if (isActiveStatus(item.status)) hadActivity = true
      checkComplete()
    })
  }

  async function restore(): Promise<UploadItem<TResult>[]> {
    const { persistence } = options
    if (!persistence || destroyed) return []
    const [records, locked] = await Promise.all([
      persistence.load(),
      getLockedIds(),
    ])
    const restored: UploadItem<TResult>[] = []
    transaction(() => {
      for (const record of records) {
        if (items.has(record.id) || locked.has(record.id)) continue
        const { __loaded, ...meta } = record.meta
        const loaded = typeof __loaded === "number" ? __loaded : 0
        const item: UploadItem<TResult> = {
          ...createItem(record.file, record.batchId, meta),
          id: record.id,
          originalFile: record.originalFile,
          status: "paused",
          pauseReason: "restored",
          resumeState:
            record.adapter === options.adapter.name ? record.resumeState : null,
          progress: createProgress(
            record.adapter === options.adapter.name ? loaded : 0,
            record.file.size
          ),
          restored: true,
          createdAt: record.createdAt,
        }
        items.set(item.id, item)
        dirty = true
        restored.push(item)
      }
      if (restored.length) emit("add", { items: restored })
    })
    return restored
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  function setOnline(online: boolean) {
    if (state.online === online) return
    transaction(() => {
      state = { ...state, online }
      dirty = true
      emit("online", { online })
      if (online) {
        for (const item of items.values()) {
          if (item.status === "paused" && item.pauseReason === "offline") {
            patch(item.id, { status: "queued", pauseReason: null })
          }
        }
        schedule()
      }
    })
  }

  function getNetwork(): NetworkMonitor | null {
    if (options.network === false) return null
    return options.network ?? createBrowserNetworkMonitor()
  }

  function mount() {
    mounts++
    if (mounts === 1) {
      suspended = false
      const network = getNetwork()
      if (network) {
        setOnline(network.isOnline())
        unsubscribeNetwork = network.subscribe(setOnline)
      }
      transaction(schedule)
    }
    let released = false
    return () => {
      if (released) return
      released = true
      mounts--
      if (mounts > 0) return
      suspended = true
      unsubscribeNetwork?.()
      unsubscribeNetwork = null
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = null
      // Requeue in-flight work so a remount (e.g. Strict Mode) picks it up.
      transaction(() => {
        for (const id of [...runtimes.keys()]) {
          const item = items.get(id)
          stop(id, "unmount")
          if (
            item &&
            (item.status === "uploading" || item.status === "processing")
          ) {
            patch(id, { status: "queued" })
          }
        }
      })
    }
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    for (const id of [...runtimes.keys(), ...preparing.keys()])
      stop(id, "destroy")
    for (const timer of persistTimers.values()) clearTimeout(timer)
    persistTimers.clear()
    if (retryTimer) clearTimeout(retryTimer)
    unsubscribeNetwork?.()
    listeners.clear()
    emitter.clear()
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    on: (event, handler) => emitter.on(event, handler),
    add,
    start,
    pause,
    resume,
    cancel,
    retry: retryItems,
    remove,
    clearCompleted,
    update,
    getItem: (id) => items.get(id),
    canPause,
    restore,
    setOptions(next) {
      options = { ...options, ...next }
      if ("retry" in next) retry = resolveRetryOptions(options.retry)
      if ("concurrency" in next) transaction(schedule)
    },
    getOptions: () => options,
    mount,
    destroy,
  }
}
