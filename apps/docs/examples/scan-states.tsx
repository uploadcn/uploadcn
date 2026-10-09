"use client"

import {
  type ProcessContext,
  type UploadItem,
  UploadError,
  s3Adapter,
} from "@uploadcn/core"

import { demoTransport, simulateBackendStep } from "@/examples/_demo"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

const adapter = s3Adapter({
  endpoint: "/api/upload",
  transport: demoTransport, // docs only, see examples/_demo.ts
})

/**
 * The browser can't scan files for malware, your backend does. `process`
 * runs after the upload and reflects the backend's verdict:
 * uploading → processing → scanning → success | rejected.
 */
async function scan(
  item: UploadItem,
  { setStatus, signal }: ProcessContext<unknown>
) {
  setStatus("scanning")
  // Your backend scans the file; here a stand-in answers.
  const verdict = await simulateBackendStep(item.name, "scan", signal)
  if (verdict === "infected") {
    throw new UploadError("Malware detected, the file was quarantined", {
      code: "rejected",
    })
  }
}

export default function ScanStatesExample() {
  return (
    <Upload adapter={adapter} process={scan}>
      <UploadDropzone>
        <UploadDropzoneTitle>
          Upload, then wait for the scan
        </UploadDropzoneTitle>
        <UploadDropzoneDescription>
          Files named like “eicar.txt” or “virus.pdf” are flagged by the demo
          scanner
        </UploadDropzoneDescription>
      </UploadDropzone>
      <UploadQueue />
    </Upload>
  )
}
