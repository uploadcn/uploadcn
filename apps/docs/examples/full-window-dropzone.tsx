"use client"

import { MiB, mockAdapter } from "@uploadcn/core"
import { MousePointerClickIcon } from "lucide-react"

import {
  GlobalDropzone,
  UploadProvider,
  UploadQueuePanel,
} from "@/registry/default/blocks/global-upload"

const adapter = mockAdapter({ speed: 2 * MiB })

/**
 * In your app, put <UploadProvider> in the root layout. While this example
 * is on screen, drag a file from your desktop anywhere over the page.
 */
export default function FullWindowDropzoneExample() {
  return (
    <UploadProvider adapter={adapter} guard={false}>
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
        <MousePointerClickIcon className="size-5" aria-hidden />
        Drag files over any part of this page
      </div>
      <GlobalDropzone />
      <UploadQueuePanel />
    </UploadProvider>
  )
}
