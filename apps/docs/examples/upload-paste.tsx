"use client"

import { PolaroidUpload } from "@/registry/default/blocks/polaroid-upload"
import { UploadPaste } from "@/registry/default/blocks/upload-paste"

export default function UploadPasteExample() {
  return (
    <UploadPaste hint>
      <PolaroidUpload maxFiles={6} />
    </UploadPaste>
  )
}
