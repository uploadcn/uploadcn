"use client"

import { demoAdapter } from "@/examples/_demo"
import { UploadDialog } from "@/registry/default/blocks/upload-dialog"

export default function UploadDialogExample() {
  return <UploadDialog adapter={demoAdapter} />
}
