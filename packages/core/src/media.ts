export interface ImageDimensions {
  width: number
  height: number
}

function assertBrowser(feature: string) {
  if (typeof document === "undefined") {
    throw new Error(`${feature} requires a browser environment`)
  }
}

/** Reads the intrinsic size of an image, honoring EXIF orientation. */
export async function getImageDimensions(file: Blob): Promise<ImageDimensions> {
  if (
    typeof createImageBitmap === "function" &&
    file.type !== "image/svg+xml"
  ) {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      })
      const dimensions = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return dimensions
    } catch {
      // Fall through to <img>, which supports more formats (e.g. SVG).
    }
  }
  assertBrowser("getImageDimensions")
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = "async"
    image.src = url
    await image.decode()
    return { width: image.naturalWidth, height: image.naturalHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Reads the duration (in seconds) of an audio or video file. */
export function getMediaDuration(
  file: Blob,
  options: { signal?: AbortSignal; timeout?: number } = {}
): Promise<number> {
  assertBrowser("getMediaDuration")
  const element = document.createElement(
    file.type.startsWith("audio/") ? "audio" : "video"
  )
  const url = URL.createObjectURL(file)
  return new Promise<number>((resolve, reject) => {
    const timer = setTimeout(
      () => finish(new Error("Timed out reading media metadata")),
      options.timeout ?? 10_000
    )
    function finish(error: Error | null, duration?: number) {
      clearTimeout(timer)
      options.signal?.removeEventListener("abort", onAbort)
      element.removeAttribute("src")
      element.load()
      URL.revokeObjectURL(url)
      if (error) reject(error)
      else resolve(duration ?? 0)
    }
    function onAbort() {
      finish(new Error("Aborted"))
    }
    options.signal?.addEventListener("abort", onAbort, { once: true })
    element.preload = "metadata"
    element.onloadedmetadata = () => {
      // Some encoders report Infinity until the media is scanned.
      finish(null, Number.isFinite(element.duration) ? element.duration : 0)
    }
    element.onerror = () => finish(new Error("Could not read media metadata"))
    element.src = url
  })
}

export function isImage(file: { type: string }) {
  return file.type.startsWith("image/")
}

export function isVideo(file: { type: string }) {
  return file.type.startsWith("video/")
}

export function isAudio(file: { type: string }) {
  return file.type.startsWith("audio/")
}

/** Whether the browser can render the file as an `<img>` preview. */
export function isPreviewableImage(file: { type: string }) {
  return /^image\/(png|jpe?g|gif|webp|avif|svg\+xml|bmp|x-icon)$/.test(
    file.type
  )
}
