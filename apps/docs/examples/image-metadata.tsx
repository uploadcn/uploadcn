"use client"

import { useUploader } from "@uploadcn/react"
import { toast } from "sonner"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { ImageMetadataUpload } from "@/registry/default/blocks/image-metadata"

export default function ImageMetadataExample() {
  const uploader = useUploader({ adapter: demoAdapter, accept: "image/*" })
  useSampleFiles(uploader, "images")
  return (
    <ImageMetadataUpload
      uploader={uploader}
      className="max-w-2xl"
      onSave={(images) =>
        toast.success(`Saved ${images.length} images`, {
          description: images.map((image) => image.alt).join(" · "),
        })
      }
    />
  )
}
