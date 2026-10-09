"use client"

import { useUploader } from "@uploadcn/react"

import { useSampleFiles } from "@/examples/_demo"
import { PropertyPhotos } from "@/registry/default/blocks/property-photos"

export default function PropertyPhotosExample() {
  const uploader = useUploader({ accept: "image/*" })
  useSampleFiles(uploader, "images")
  return (
    <div className="w-full max-w-xl">
      <PropertyPhotos uploader={uploader} />
    </div>
  )
}
