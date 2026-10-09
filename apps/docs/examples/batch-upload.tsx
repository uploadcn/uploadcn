"use client"

import { toast } from "sonner"

import { FileUpload } from "@/registry/default/blocks/file-upload"

export default function BatchUploadExample() {
  return (
    <FileUpload
      autoUpload={false}
      title="Select files, review them, then upload"
      description='Nothing is sent until you press "Upload"'
      onComplete={(items) =>
        toast.success(
          `Batch finished: ${items.filter((item) => item.status === "success").length} uploaded`
        )
      }
    />
  )
}
