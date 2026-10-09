"use client"

import { demoAdapter } from "@/examples/_demo"
import { FolderUpload } from "@/registry/default/blocks/folder-upload"

export default function FolderUploadExample() {
  return <FolderUpload adapter={demoAdapter} name="Q3 Reports" />
}
