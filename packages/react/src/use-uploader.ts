import {
  type UploadAdapter,
  type UploadError,
  type UploadItem,
  type Uploader,
  type UploaderOptions,
  createUploader,
} from "@uploadcn/core"
import * as React from "react"

import { stripUndefined, useUploadConfig } from "./config"

export interface UploaderCallbacks<TResult> {
  onAdd?: (items: UploadItem<TResult>[]) => void
  onReject?: (item: UploadItem<TResult>) => void
  onSuccess?: (item: UploadItem<TResult>) => void
  onError?: (item: UploadItem<TResult>, error: UploadError) => void
  /** Called when the queue drains after uploads finished. */
  onComplete?: (items: UploadItem<TResult>[]) => void
}

export interface UseUploaderOptions<TResult>
  extends
    Omit<UploaderOptions<TResult>, "adapter">,
    UploaderCallbacks<TResult> {
  /**
   * Where files go. Defaults to the adapter from the nearest
   * `UploadConfigProvider`.
   */
  adapter?: UploadAdapter<TResult>
  /** Restore persisted uploads on mount (requires `persistence`). */
  restore?: boolean
}

function splitOptions<TResult>(options: UseUploaderOptions<TResult>) {
  const {
    onAdd,
    onReject,
    onSuccess,
    onError,
    onComplete,
    restore,
    ...engine
  } = options
  return {
    callbacks: { onAdd, onReject, onSuccess, onError, onComplete },
    restore,
    engine,
  }
}

const NO_ADAPTER =
  "UploadCN: no adapter. Pass `adapter` to the component or useUploader, " +
  "or wrap your app in <UploadConfigProvider adapter={…}>. " +
  "See https://uploadcn.dev/docs/storage"

/**
 * Creates an upload engine bound to the component's lifetime. The instance
 * is stable; option changes (including a new adapter) apply on the next
 * render without recreating it.
 */
export function useUploader<TResult = unknown>(
  options: UseUploaderOptions<TResult> = {}
): Uploader<TResult> {
  const { messages: _messages, ...defaults } = useUploadConfig()
  const { callbacks, restore, engine: own } = splitOptions(options)
  const engine = {
    ...defaults,
    ...stripUndefined(own),
  } as UploaderOptions<TResult>
  if (!engine.adapter) throw new Error(NO_ADAPTER)
  const [uploader] = React.useState(() => createUploader<TResult>(engine))

  const callbacksRef = React.useRef(callbacks)
  React.useEffect(() => {
    callbacksRef.current = callbacks
    uploader.setOptions(engine)
  })

  React.useEffect(() => {
    const unsubscribers = [
      uploader.on("add", ({ items }) => callbacksRef.current.onAdd?.(items)),
      uploader.on("reject", ({ item }) =>
        callbacksRef.current.onReject?.(item)
      ),
      uploader.on("success", ({ item }) =>
        callbacksRef.current.onSuccess?.(item)
      ),
      uploader.on("error", ({ item, error }) =>
        callbacksRef.current.onError?.(item, error)
      ),
      uploader.on("complete", ({ items }) =>
        callbacksRef.current.onComplete?.(items)
      ),
    ]
    const unmount = uploader.mount()
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe()
      unmount()
    }
  }, [uploader])

  React.useEffect(() => {
    if (restore) void uploader.restore()
  }, [uploader, restore])

  return uploader
}
