"use client"

import { ImageUpload } from "@/registry/default/blocks/image-upload"

export default function ImageUploadExample() {
  return <ImageUpload compress maxWidth={2000} maxFiles={8} />
}
