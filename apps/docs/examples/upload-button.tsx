"use client"

import { toast } from "sonner"

import { UploadButton } from "@/registry/default/blocks/upload-button"

export default function UploadButtonExample() {
  return (
    <UploadButton
      className="w-auto"
      onSuccess={(item) => toast.success(`${item.name} uploaded`)}
    >
      Upload file
    </UploadButton>
  )
}
