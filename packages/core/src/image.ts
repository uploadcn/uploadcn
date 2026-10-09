/**
 * Client-side image processing: resize, compress, crop, rotate and flip,
 * using only native browser APIs (createImageBitmap + canvas).
 *
 * Re-encoding strips EXIF metadata (including GPS location) after applying
 * the EXIF orientation, which is usually what you want for user uploads.
 */
export { getImageDimensions, type ImageDimensions } from "./media"

export type ImageOutputType =
  "image/jpeg" | "image/webp" | "image/png" | "image/avif"

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageTransformOptions {
  /** Fit inside this width, preserving aspect ratio. */
  maxWidth?: number
  /** Fit inside this height, preserving aspect ratio. */
  maxHeight?: number
  /** Encoder quality from 0 to 1 (JPEG/WebP/AVIF). Default `0.85`. */
  quality?: number
  /** Output type. Default: keep PNG/WebP/AVIF, convert everything else to JPEG. */
  type?: ImageOutputType
  /** Crop area in pixels of the oriented + rotated image. */
  crop?: CropArea
  /** Clockwise rotation in degrees. */
  rotate?: number
  flipHorizontal?: boolean
  flipVertical?: boolean
  /** Fill for transparent pixels when encoding to JPEG. Default white. */
  background?: string
  /**
   * Return the original file if the result is larger and no geometry changed.
   * Default `true`.
   */
  keepSmaller?: boolean
}

/** Formats that must not be re-encoded (animation or vectors would be lost). */
const PASSTHROUGH_TYPES = new Set(["image/gif", "image/svg+xml", "image/apng"])

export function canTransformImage(file: { type: string }) {
  return file.type.startsWith("image/") && !PASSTHROUGH_TYPES.has(file.type)
}

function resolveOutputType(
  input: string,
  requested?: ImageOutputType
): ImageOutputType {
  if (requested) return requested
  if (
    input === "image/png" ||
    input === "image/webp" ||
    input === "image/avif"
  ) {
    return input
  }
  return "image/jpeg"
}

const EXTENSIONS: Record<ImageOutputType, string> = {
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/png": "png",
  "image/avif": "avif",
}

function renameForType(name: string, type: ImageOutputType) {
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name
  return `${base}.${EXTENSIONS[type]}`
}

type Canvas2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D
type AnyCanvas = OffscreenCanvas | HTMLCanvasElement

function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height)
  }
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

function getContext(canvas: AnyCanvas): Canvas2D {
  const context = canvas.getContext("2d") as Canvas2D | null
  if (!context) throw new Error("Canvas 2D context is not available")
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  return context
}

async function encode(
  canvas: AnyCanvas,
  type: ImageOutputType,
  quality: number
): Promise<Blob> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality })
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Image encoding failed")),
      type,
      quality
    )
  )
}

async function decode(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" })
}

/** Size of a w×h box after rotating it by `degrees`. */
export function getRotatedSize(width: number, height: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))
  return {
    width: Math.round(width * cos + height * sin),
    height: Math.round(width * sin + height * cos),
  }
}

/** Scale factor to fit width×height inside the max bounds (never upscales). */
export function getFitScale(
  width: number,
  height: number,
  maxWidth = Infinity,
  maxHeight = Infinity
) {
  return Math.min(1, maxWidth / width, maxHeight / height)
}

/**
 * Applies orientation, rotation, flip, crop and resize in one pass and
 * re-encodes the image.
 */
export async function transformImage(
  file: File,
  options: ImageTransformOptions = {}
): Promise<File> {
  if (!canTransformImage(file)) return file
  const type = resolveOutputType(file.type, options.type)
  const quality = options.quality ?? 0.85
  const rotate = (((options.rotate ?? 0) % 360) + 360) % 360
  const bitmap = await decode(file)

  try {
    // 1. Rotate + flip into a canvas the size of the rotated bounding box.
    const rotated = getRotatedSize(bitmap.width, bitmap.height, rotate)
    let source: AnyCanvas | ImageBitmap = bitmap
    let sourceWidth = bitmap.width
    let sourceHeight = bitmap.height
    const flips = options.flipHorizontal || options.flipVertical
    if (rotate !== 0 || flips) {
      const canvas = createCanvas(rotated.width, rotated.height)
      const context = getContext(canvas)
      context.translate(rotated.width / 2, rotated.height / 2)
      context.rotate((rotate * Math.PI) / 180)
      context.scale(
        options.flipHorizontal ? -1 : 1,
        options.flipVertical ? -1 : 1
      )
      context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
      source = canvas
      sourceWidth = rotated.width
      sourceHeight = rotated.height
    }

    // 2. Crop (clamped to the image) and fit inside max bounds.
    const crop = options.crop
      ? {
          x: Math.max(0, Math.round(options.crop.x)),
          y: Math.max(0, Math.round(options.crop.y)),
          width: Math.round(Math.min(options.crop.width, sourceWidth)),
          height: Math.round(Math.min(options.crop.height, sourceHeight)),
        }
      : { x: 0, y: 0, width: sourceWidth, height: sourceHeight }
    const scale = getFitScale(
      crop.width,
      crop.height,
      options.maxWidth,
      options.maxHeight
    )
    const width = Math.max(1, Math.round(crop.width * scale))
    const height = Math.max(1, Math.round(crop.height * scale))

    const output = createCanvas(width, height)
    const context = getContext(output)
    if (type === "image/jpeg") {
      context.fillStyle = options.background ?? "#fff"
      context.fillRect(0, 0, width, height)
    }
    context.drawImage(
      source,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      width,
      height
    )
    const blob = await encode(output, type, quality)

    const geometryChanged =
      rotate !== 0 ||
      !!flips ||
      !!options.crop ||
      scale < 1 ||
      type !== file.type
    if (
      (options.keepSmaller ?? true) &&
      !geometryChanged &&
      blob.size >= file.size
    ) {
      return file
    }
    const name = type === file.type ? file.name : renameForType(file.name, type)
    return new File([blob], name, { type, lastModified: Date.now() })
  } finally {
    bitmap.close()
  }
}

export interface CompressImageOptions extends Pick<
  ImageTransformOptions,
  "maxWidth" | "maxHeight" | "quality" | "type"
> {
  /** Skip files smaller than this many bytes. Default 0. */
  minSize?: number
}

/**
 * Downscales and re-encodes an image. Returns the original file when
 * compression would not help.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  if (!canTransformImage(file) || file.size < (options.minSize ?? 0))
    return file
  const result = await transformImage(file, {
    maxWidth: options.maxWidth ?? 2048,
    maxHeight: options.maxHeight ?? 2048,
    quality: options.quality ?? 0.82,
    type: options.type,
    keepSmaller: true,
  })
  return result.size < file.size ? result : file
}

/**
 * Builds an uploader `transform` that compresses images and passes every
 * other file through untouched.
 *
 * @example
 * createUploader({ adapter, transform: imageTransform({ maxWidth: 2000 }) })
 */
export function imageTransform(options: CompressImageOptions = {}) {
  return (file: File) => compressImage(file, options)
}
