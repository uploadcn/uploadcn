"use client"

import { demoAdapter } from "@/examples/_demo"
import { UploadTabs } from "@/registry/default/blocks/upload-tabs"

export default function UploadTabsExample() {
  return (
    <div className="w-full max-w-md">
      <UploadTabs adapter={demoAdapter} />
    </div>
  )
}
