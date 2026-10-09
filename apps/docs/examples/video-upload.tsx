"use client"

import { VideoUpload } from "@/registry/default/blocks/video-upload"

export default function VideoUploadExample() {
  return <VideoUpload maxDuration={10 * 60} />
}
