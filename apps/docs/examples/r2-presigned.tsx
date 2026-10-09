"use client"

import { MiB, r2Adapter } from "@uploadcn/core"

import { demoTransport } from "@/examples/_demo"
import { FileUpload } from "@/registry/default/blocks/file-upload"

/**
 * R2 speaks the S3 API: the browser code is the same, the server route
 * uses `r2Storage({ accountId, bucket, … })`. Multipart kicks in at 32 MB.
 */
const adapter = r2Adapter({
  endpoint: "/api/upload",
  transport: demoTransport, // docs only, see examples/_demo.ts
  multipart: { threshold: 32 * MiB, partSize: 8 * MiB, concurrency: 4 },
})

export default function R2PresignedExample() {
  return (
    <FileUpload adapter={adapter} title="Upload directly to Cloudflare R2" />
  )
}
