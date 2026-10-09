"use client"

import { demoAdapter } from "@/examples/_demo"
import { UploadIsland } from "@/registry/default/blocks/upload-island"

export default function UploadIslandExample() {
  return <UploadIsland adapter={demoAdapter} />
}
