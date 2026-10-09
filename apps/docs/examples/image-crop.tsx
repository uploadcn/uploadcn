"use client"

import { ImageUpload } from "@/registry/default/blocks/image-upload"

export default function ImageCropExample() {
  return (
    <ImageUpload
      crop={{ aspect: 16 / 9 }}
      compress
      maxWidth={1920}
      maxFiles={4}
    />
  )
}
