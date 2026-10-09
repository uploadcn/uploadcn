"use client"

import { s3Adapter } from "@uploadcn/core"

import { demoTransport } from "@/examples/_demo"
import { FileUpload } from "@/registry/default/blocks/file-upload"

/**
 * 1. The browser asks /api/upload for a signed PUT URL (size + type locked).
 * 2. Bytes go straight to the bucket, never through your server.
 * 3. The route verifies the object and runs `onUploadComplete`.
 * Files ≥ 64 MB automatically switch to resumable multipart.
 */
const adapter = s3Adapter({
  endpoint: "/api/upload",
  transport: demoTransport, // docs only, see examples/_demo.ts
})

export default function S3PresignedExample() {
  return <FileUpload adapter={adapter} title="Upload directly to S3" />
}
