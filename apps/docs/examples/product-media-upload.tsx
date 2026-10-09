"use client"

import { useUploader } from "@uploadcn/react"

import { useSampleFiles } from "@/examples/_demo"
import { ProductMediaUpload } from "@/registry/default/blocks/product-media-upload"

export default function ProductMediaUploadExample() {
  const uploader = useUploader({ accept: "image/*", maxFiles: 8 })
  useSampleFiles(uploader, "images")
  return (
    <div className="w-full max-w-xl">
      <ProductMediaUpload uploader={uploader} />
    </div>
  )
}
