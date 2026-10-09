import { type Uploader, getUploadSummary } from "@uploadcn/core"
import * as React from "react"

import { useUploadSelector } from "./use-upload-selector"

function subscribe(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

/**
 * `navigator.onLine`, kept in sync with `online`/`offline` events. `true`
 * on the server. Note that "online" only means a network interface is up.
 */
export function useNetworkStatus(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )
}

export interface UseUploadGuardOptions {
  /** Default `true`. */
  enabled?: boolean
}

/**
 * Warns before closing or reloading the tab while uploads are in progress.
 * Browsers show their own generic message; custom text is not supported.
 */
export function useUploadGuard<TResult>(
  uploader: Uploader<TResult>,
  { enabled = true }: UseUploadGuardOptions = {}
) {
  const isUploading = useUploadSelector(
    uploader,
    (state) => getUploadSummary(state.items).isUploading
  )

  React.useEffect(() => {
    if (!enabled || !isUploading) return
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [enabled, isUploading])

  return isUploading
}
