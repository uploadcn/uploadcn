"use client"

import { AudioUpload } from "@/registry/default/blocks/audio-upload"

export default function AudioUploadExample() {
  return <AudioUpload maxDuration={60 * 60} />
}
