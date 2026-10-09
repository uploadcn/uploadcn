"use client"

import { FileTextIcon } from "lucide-react"

import { demoAdapter } from "@/examples/_demo"
import {
  Upload,
  UploadOverlay,
  UploadQueue,
} from "@/registry/default/ui/upload"

export default function UploadOverlayExample() {
  return (
    <Upload adapter={demoAdapter} className="max-w-lg">
      <UploadOverlay
        className="rounded-xl border bg-card p-5"
        label="Drop to attach"
        description="Files are added to this note"
      >
        <article className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileTextIcon className="size-4 text-muted-foreground" />
            Launch checklist
          </div>
          <p className="text-sm text-muted-foreground">
            Drag files from your desktop onto this card. The content stays
            selectable and clickable, the overlay only appears while you drag.
          </p>
        </article>
      </UploadOverlay>
      <UploadQueue size="sm" variant="muted" />
    </Upload>
  )
}
