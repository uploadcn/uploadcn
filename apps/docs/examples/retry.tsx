"use client"

import { MiB, UploadError, mockAdapter } from "@uploadcn/core"

import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

/**
 * The first two attempts of every upload fail with a retryable 503. The
 * engine retries once with exponential backoff; when that fails too, a
 * manual retry (which resets the retry budget) succeeds.
 */
const failures = new Map<string, number>()
const adapter = mockAdapter({
  speed: 2 * MiB,
  resumable: false,
  fail: ({ item }) => {
    const count = (failures.get(item.id) ?? 0) + 1
    failures.set(item.id, count)
    return count <= 2
      ? new UploadError("Service unavailable (503)", {
          code: "http",
          status: 503,
          retryable: true,
        })
      : null
  },
})

export default function RetryExample() {
  return (
    <Upload adapter={adapter} retry={{ retries: 1, baseDelay: 1500 }}>
      <UploadDropzone>
        <UploadDropzoneTitle>Drop a file to watch retries</UploadDropzoneTitle>
        <UploadDropzoneDescription>
          Attempt 1 fails → automatic retry (backoff) fails → retry manually →
          succeeds
        </UploadDropzoneDescription>
      </UploadDropzone>
      <UploadQueue />
    </Upload>
  )
}
