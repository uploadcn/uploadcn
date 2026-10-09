"use client"

import { createAdapter } from "@uploadcn/core"

import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

/**
 * Any upload function becomes an adapter, your API, Supabase, Firebase,
 * Vercel Blob or a server action. This one simulates a network call.
 */
const adapter = createAdapter(async ({ file, signal, onProgress }) => {
  for (let loaded = 0; loaded < file.size; loaded += file.size / 20) {
    signal.throwIfAborted()
    await new Promise((resolve) => setTimeout(resolve, 60))
    onProgress(loaded)
  }
  return { url: `https://cdn.example.com/${encodeURIComponent(file.name)}` }
})

export default function CustomAdapterExample() {
  return (
    <Upload adapter={adapter} className="max-w-md">
      <UploadDropzone size="sm">
        <UploadDropzoneTitle>Your own upload function</UploadDropzoneTitle>
        <UploadDropzoneDescription>
          Progress, cancel and retry still work
        </UploadDropzoneDescription>
      </UploadDropzone>
      <UploadQueue size="sm" />
    </Upload>
  )
}
