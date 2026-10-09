import { isPreviewableImage } from "@uploadcn/core"
import * as React from "react"

export type PreviewKind = "image" | "video" | "audio" | "pdf" | "file"

export function getPreviewKind(file: {
  type: string
  name: string
}): PreviewKind {
  if (isPreviewableImage(file)) return "image"
  if (file.type.startsWith("video/")) return "video"
  if (file.type.startsWith("audio/")) return "audio"
  if (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {
    return "pdf"
  }
  return "file"
}

export interface UseFilePreviewOptions {
  /**
   * For images, render a downscaled thumbnail no larger than this many
   * pixels instead of decoding the full image — keeps large galleries fast.
   */
  thumbnailSize?: number
}

async function createThumbnail(file: Blob, size: number): Promise<Blob | null> {
  if (
    typeof createImageBitmap !== "function" ||
    file.type === "image/svg+xml"
  ) {
    return null
  }
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  })
  try {
    const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height))
    if (scale === 1) return null
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement("canvas"), { width, height })
    const context = canvas.getContext("2d") as
      OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null
    if (!context) return null
    context.drawImage(bitmap, 0, 0, width, height)
    if ("convertToBlob" in canvas) {
      return canvas.convertToBlob({ type: "image/webp", quality: 0.8 })
    }
    return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.8))
  } finally {
    bitmap.close()
  }
}

/**
 * An object URL for previewing a file, revoked automatically when the file
 * changes or the component unmounts.
 */
export function useFilePreview(
  file: File | Blob | null | undefined,
  { thumbnailSize }: UseFilePreviewOptions = {}
): string | null {
  const [preview, setPreview] = React.useState<{
    source: Blob
    url: string
  } | null>(null)

  React.useEffect(() => {
    if (!file) return
    let cancelled = false
    let objectUrl: string | null = null
    const source = file

    const publish = (blob: Blob) => {
      if (cancelled) return
      objectUrl = URL.createObjectURL(blob)
      setPreview({ source, url: objectUrl })
    }
    const thumbnail =
      thumbnailSize && file.type.startsWith("image/")
        ? createThumbnail(file, thumbnailSize).catch(() => null)
        : Promise.resolve(null)
    void thumbnail.then((blob) => publish(blob ?? source))

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file, thumbnailSize])

  // A stale URL (for a previous file) is never returned.
  return preview && preview.source === file ? preview.url : null
}
