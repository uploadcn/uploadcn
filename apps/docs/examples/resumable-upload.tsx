"use client"

import * as React from "react"
import { MiB, createIndexedDBPersistence, s3Adapter } from "@uploadcn/core"
import { useUploadSelector, useUploader } from "@uploadcn/react"
import { HistoryIcon } from "lucide-react"

import { demoTransport } from "@/examples/_demo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

/** Files ≥ 5 MB use multipart, so they resume from the last finished part. */
const adapter = s3Adapter({
  endpoint: "/api/upload",
  transport: demoTransport, // docs only, see examples/_demo.ts
  multipart: { threshold: 5 * MiB, partSize: 5 * MiB },
})

export default function ResumableUploadExample() {
  const [persistence] = React.useState(() =>
    createIndexedDBPersistence({ name: "uploadcn-docs-resumable" })
  )
  const uploader = useUploader({ adapter, persistence, restore: true })
  const restored = useUploadSelector(
    uploader,
    (state) =>
      state.items.filter((item) => item.restored && item.status === "paused")
        .length
  )

  return (
    <Upload uploader={uploader}>
      {restored > 0 ? (
        <Alert>
          <HistoryIcon />
          <AlertTitle>
            {restored} upload{restored === 1 ? "" : "s"} restored
          </AlertTitle>
          <AlertDescription>
            Press resume to continue from the last finished part.
          </AlertDescription>
        </Alert>
      ) : null}
      <UploadDropzone>
        <UploadDropzoneTitle>
          Drop a large file, then reload the page
        </UploadDropzoneTitle>
        <UploadDropzoneDescription>
          The file and its finished parts are kept in IndexedDB
        </UploadDropzoneDescription>
      </UploadDropzone>
      <UploadQueue />
    </Upload>
  )
}
