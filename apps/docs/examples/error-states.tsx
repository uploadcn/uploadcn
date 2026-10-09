"use client"

import { MiB, UploadError, mockAdapter } from "@uploadcn/core"

import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

/** Fails based on the file name so each state is easy to reproduce. */
const adapter = mockAdapter({
  speed: 3 * MiB,
  resumable: false,
  fail: ({ file }) => {
    const name = file.name.toLowerCase()
    if (name.includes("forbidden")) {
      return new UploadError("You don't have permission to upload here (403)", {
        code: "http",
        status: 403,
      })
    }
    if (name.includes("large")) {
      return new UploadError(
        "The server rejected the file as too large (413)",
        { code: "http", status: 413 }
      )
    }
    if (/\.(exe|bat|sh)$/.test(name)) {
      return new UploadError("Executable files are blocked", {
        code: "rejected",
      })
    }
    return Math.random() < 0.4
      ? new UploadError("Connection reset", {
          code: "network",
          retryable: true,
        })
      : null
  },
})

export default function ErrorStatesExample() {
  return (
    <Upload
      adapter={adapter}
      maxSize={20 * MiB}
      retry={{ retries: 1, baseDelay: 800 }}
    >
      <UploadDropzone>
        <UploadDropzoneTitle>
          Drop files to trigger failures
        </UploadDropzoneTitle>
        <UploadDropzoneDescription>
          Names with “forbidden” → 403 · “large” → 413 · .exe/.sh → blocked ·
          others fail randomly (retryable)
        </UploadDropzoneDescription>
      </UploadDropzone>
      <UploadQueue />
    </Upload>
  )
}
