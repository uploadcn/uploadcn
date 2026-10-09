import {
  type UploadItem,
  type UploadSummary,
  type Uploader,
  getUploadSummary,
} from "@uploadcn/core"
import * as React from "react"

import { useUploadSelector } from "./use-upload-selector"
import { type UseUploaderOptions, useUploader } from "./use-uploader"

export interface UseUploadReturn<TResult> {
  uploader: Uploader<TResult>
  items: readonly UploadItem<TResult>[]
  summary: UploadSummary
  online: boolean
  add: Uploader<TResult>["add"]
  start: Uploader<TResult>["start"]
  pause: Uploader<TResult>["pause"]
  resume: Uploader<TResult>["resume"]
  cancel: Uploader<TResult>["cancel"]
  retry: Uploader<TResult>["retry"]
  remove: Uploader<TResult>["remove"]
  clearCompleted: Uploader<TResult>["clearCompleted"]
  update: Uploader<TResult>["update"]
}

/**
 * The all-in-one hook: creates an uploader and returns its items, an
 * aggregate summary and bound actions.
 *
 * @example
 * const { items, add, summary } = useUpload({ adapter: s3Adapter({ endpoint: "/api/upload" }) })
 */
export function useUpload<TResult = unknown>(
  options: UseUploaderOptions<TResult>
): UseUploadReturn<TResult> {
  const uploader = useUploader(options)
  return useUploadState(uploader)
}

/** Like `useUpload`, for an uploader created elsewhere (e.g. from context). */
export function useUploadState<TResult>(
  uploader: Uploader<TResult>
): UseUploadReturn<TResult> {
  const state = useUploadSelector(uploader, (s) => s)
  const summary = React.useMemo(
    () => getUploadSummary(state.items),
    [state.items]
  )
  return React.useMemo(
    () => ({
      uploader,
      items: state.items,
      summary,
      online: state.online,
      add: uploader.add,
      start: uploader.start,
      pause: uploader.pause,
      resume: uploader.resume,
      cancel: uploader.cancel,
      retry: uploader.retry,
      remove: uploader.remove,
      clearCompleted: uploader.clearCompleted,
      update: uploader.update,
    }),
    [uploader, state, summary]
  )
}

/** Aggregate progress, speed, ETA and counts for the whole queue. */
export function useUploadProgress<TResult>(
  uploader: Uploader<TResult>
): UploadSummary {
  const items = useUploadSelector(uploader, (state) => state.items)
  return React.useMemo(() => getUploadSummary(items), [items])
}

/**
 * Derives form values from successful uploads — e.g. object keys for a
 * server action or react-hook-form field. Pass a stable `getValue` (defined
 * outside the component or memoized) to keep the returned array stable.
 */
export function useUploadValue<TResult, TValue>(
  uploader: Uploader<TResult>,
  getValue: (item: UploadItem<TResult>) => TValue
): TValue[] {
  const items = useUploadSelector(uploader, (state) => state.items)
  return React.useMemo(
    () =>
      items
        .filter((item) => item.status === "success")
        .map((item) => getValue(item)),
    [items, getValue]
  )
}
