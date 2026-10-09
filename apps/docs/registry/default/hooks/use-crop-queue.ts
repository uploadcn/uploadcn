"use client"

import * as React from "react"

interface CropRequest {
  file: File
  resolve: (file: File) => void
}

/**
 * Turns an interactive crop dialog into an async step: `request(file)`
 * resolves once the user applies (cropped file) or skips (original file).
 * Requests queue up, so several images are cropped one after another.
 *
 * @example
 * const crops = useCropQueue()
 * <Upload transform={crops.request} … />
 * <ImageCropper file={crops.current} onCrop={crops.complete} onCancel={crops.skip} />
 */
export function useCropQueue() {
  const [queue, setQueue] = React.useState<CropRequest[]>([])
  const current = queue[0] ?? null

  const request = React.useCallback(
    (file: File) =>
      new Promise<File>((resolve) => {
        if (
          !file.type.startsWith("image/") ||
          file.type === "image/gif" ||
          file.type === "image/svg+xml"
        ) {
          resolve(file)
          return
        }
        setQueue((previous) => [...previous, { file, resolve }])
      }),
    []
  )

  const settle = React.useCallback(
    (result: (file: File) => File) => {
      if (!current) return
      current.resolve(result(current.file))
      setQueue((previous) => previous.slice(1))
    },
    [current]
  )

  return {
    /** The file waiting to be cropped, or `null`. */
    current: current?.file ?? null,
    /** How many crops are waiting, including the current one. */
    pending: queue.length,
    request,
    complete: (cropped: File) => settle(() => cropped),
    skip: () => settle((original) => original),
  }
}
