"use client"

import type * as React from "react"
import dynamic from "next/dynamic"

import { Spinner } from "@/components/ui/spinner"

const loading = () => (
  <div className="flex min-h-40 items-center justify-center">
    <Spinner />
  </div>
)

/** Code-split example components, keyed by file name. */
export const exampleComponents: Record<string, React.ComponentType> = {
  "ai-document-upload": dynamic(() => import("./ai-document-upload"), {
    loading,
  }),
  "animated-upload-queue": dynamic(() => import("./animated-upload-queue"), {
    loading,
  }),
  "assignment-submission": dynamic(() => import("./assignment-submission"), {
    loading,
  }),
  "audio-upload": dynamic(() => import("./audio-upload"), { loading }),
  "avatar-upload": dynamic(() => import("./avatar-upload"), { loading }),
  "background-upload": dynamic(() => import("./background-upload"), {
    loading,
  }),
  "basic-upload": dynamic(() => import("./basic-upload"), { loading }),
  "batch-upload": dynamic(() => import("./batch-upload"), { loading }),
  "camera-upload": dynamic(() => import("./camera-upload"), { loading }),
  "chat-attachment": dynamic(() => import("./chat-attachment"), { loading }),
  "chunked-upload": dynamic(() => import("./chunked-upload"), { loading }),
  "cloud-dropzone": dynamic(() => import("./cloud-dropzone"), { loading }),
  "csv-import": dynamic(() => import("./csv-import"), { loading }),
  "custom-adapter": dynamic(() => import("./custom-adapter"), { loading }),
  "custom-upload-ui": dynamic(() => import("./custom-upload-ui"), { loading }),
  "document-checklist": dynamic(() => import("./document-checklist"), {
    loading,
  }),
  "document-upload": dynamic(() => import("./document-upload"), { loading }),
  "drag-drop": dynamic(() => import("./drag-drop"), { loading }),
  "envelope-upload": dynamic(() => import("./envelope-upload"), { loading }),
  "error-states": dynamic(() => import("./error-states"), { loading }),
  "file-restrictions": dynamic(() => import("./file-restrictions"), {
    loading,
  }),
  "flip-card-upload": dynamic(() => import("./flip-card-upload"), { loading }),
  "folder-upload": dynamic(() => import("./folder-upload"), { loading }),
  "form-upload": dynamic(() => import("./form-upload"), { loading }),
  "full-window-dropzone": dynamic(() => import("./full-window-dropzone"), {
    loading,
  }),
  "gallery-upload": dynamic(() => import("./gallery-upload"), { loading }),
  "identity-verification": dynamic(() => import("./identity-verification"), {
    loading,
  }),
  "image-compression": dynamic(() => import("./image-compression"), {
    loading,
  }),
  "image-crop": dynamic(() => import("./image-crop"), { loading }),
  "image-metadata": dynamic(() => import("./image-metadata"), { loading }),
  "image-reveal-upload": dynamic(() => import("./image-reveal-upload"), {
    loading,
  }),
  "image-upload": dynamic(() => import("./image-upload"), { loading }),
  "job-application-upload": dynamic(() => import("./job-application-upload"), {
    loading,
  }),
  "liquid-dropzone": dynamic(() => import("./liquid-dropzone"), { loading }),
  "logo-upload": dynamic(() => import("./logo-upload"), { loading }),
  "magnetic-dropzone": dynamic(() => import("./magnetic-dropzone"), {
    loading,
  }),
  "multiple-upload": dynamic(() => import("./multiple-upload"), { loading }),
  "orbit-upload": dynamic(() => import("./orbit-upload"), { loading }),
  "paper-plane-button": dynamic(() => import("./paper-plane-button"), {
    loading,
  }),
  "pause-resume": dynamic(() => import("./pause-resume"), { loading }),
  "pdf-upload": dynamic(() => import("./pdf-upload"), { loading }),
  "polaroid-upload": dynamic(() => import("./polaroid-upload"), { loading }),
  "product-media-upload": dynamic(() => import("./product-media-upload"), {
    loading,
  }),
  "progress-ring-upload": dynamic(() => import("./progress-ring-upload"), {
    loading,
  }),
  "property-photos": dynamic(() => import("./property-photos"), { loading }),
  "r2-presigned": dynamic(() => import("./r2-presigned"), { loading }),
  "receipt-upload": dynamic(() => import("./receipt-upload"), { loading }),
  "ocr-upload": dynamic(() => import("./ocr-upload"), { loading }),
  "vinyl-upload": dynamic(() => import("./vinyl-upload"), { loading }),
  "rocket-upload": dynamic(() => import("./rocket-upload"), { loading }),
  "battery-upload": dynamic(() => import("./battery-upload"), { loading }),
  "typewriter-upload": dynamic(() => import("./typewriter-upload"), {
    loading,
  }),
  "hourglass-upload": dynamic(() => import("./hourglass-upload"), { loading }),
  "blueprint-upload": dynamic(() => import("./blueprint-upload"), { loading }),
  "stamp-upload": dynamic(() => import("./stamp-upload"), { loading }),
  "delivery-upload": dynamic(() => import("./delivery-upload"), { loading }),
  "required-upload": dynamic(() => import("./required-upload"), { loading }),
  "resumable-upload": dynamic(() => import("./resumable-upload"), { loading }),
  retry: dynamic(() => import("./retry"), { loading }),
  "ripple-dropzone": dynamic(() => import("./ripple-dropzone"), { loading }),
  "s3-presigned": dynamic(() => import("./s3-presigned"), { loading }),
  "scan-states": dynamic(() => import("./scan-states"), { loading }),
  "scanner-upload": dynamic(() => import("./scanner-upload"), { loading }),
  "shopping-bag-upload": dynamic(() => import("./shopping-bag-upload"), {
    loading,
  }),
  "ui-only-form": dynamic(() => import("./ui-only-form"), { loading }),
  "upload-button": dynamic(() => import("./upload-button"), { loading }),
  "upload-card": dynamic(() => import("./upload-card"), { loading }),
  "upload-chips": dynamic(() => import("./upload-chips"), { loading }),
  "upload-confetti": dynamic(() => import("./upload-confetti"), { loading }),
  "upload-demo": dynamic(() => import("./upload-demo"), { loading }),
  "upload-dialog": dynamic(() => import("./upload-dialog"), { loading }),
  "upload-dock": dynamic(() => import("./upload-dock"), { loading }),
  "upload-dropzone-horizontal": dynamic(
    () => import("./upload-dropzone-horizontal"),
    { loading }
  ),
  "upload-dropzone-variants": dynamic(
    () => import("./upload-dropzone-variants"),
    { loading }
  ),
  "upload-grid": dynamic(() => import("./upload-grid"), { loading }),
  "upload-island": dynamic(() => import("./upload-island"), { loading }),
  "upload-item-sizes": dynamic(() => import("./upload-item-sizes"), {
    loading,
  }),
  "upload-item-variants": dynamic(() => import("./upload-item-variants"), {
    loading,
  }),
  "upload-morph-button": dynamic(() => import("./upload-morph-button"), {
    loading,
  }),
  "upload-odometer": dynamic(() => import("./upload-odometer"), { loading }),
  "upload-overlay": dynamic(() => import("./upload-overlay"), { loading }),
  "upload-popover": dynamic(() => import("./upload-popover"), { loading }),
  "upload-queue": dynamic(() => import("./upload-queue"), { loading }),
  "upload-slots": dynamic(() => import("./upload-slots"), { loading }),
  "upload-stack": dynamic(() => import("./upload-stack"), { loading }),
  "upload-table": dynamic(() => import("./upload-table"), { loading }),
  "upload-tabs": dynamic(() => import("./upload-tabs"), { loading }),
  "upload-terminal": dynamic(() => import("./upload-terminal"), { loading }),
  "upload-trigger": dynamic(() => import("./upload-trigger"), { loading }),
  "video-upload": dynamic(() => import("./video-upload"), { loading }),
}

export function ExampleRenderer({ name }: { name: string }) {
  const Component = exampleComponents[name]
  if (!Component) {
    return <p className="text-sm text-destructive">Unknown example “{name}”.</p>
  }
  return <Component />
}
