import {
  type CompressImageOptions,
  type CropArea,
  type ImageTransformOptions,
  compressImage,
  transformImage,
} from "@uploadcn/core/image"
import * as React from "react"

export interface CompressionStats {
  before: number
  after: number
  /** Fraction saved, 0–1. */
  saved: number
}

/** Compresses images on demand and reports how much was saved. */
export function useImageCompression(options: CompressImageOptions = {}) {
  const [isCompressing, setIsCompressing] = React.useState(false)
  const [stats, setStats] = React.useState<CompressionStats | null>(null)
  const [error, setError] = React.useState<Error | null>(null)
  const optionsRef = React.useRef(options)
  React.useEffect(() => {
    optionsRef.current = options
  })

  const compress = React.useCallback(async (file: File) => {
    setIsCompressing(true)
    setError(null)
    try {
      const result = await compressImage(file, optionsRef.current)
      setStats({
        before: file.size,
        after: result.size,
        saved: file.size === 0 ? 0 : 1 - result.size / file.size,
      })
      return result
    } catch (cause) {
      const failure = cause instanceof Error ? cause : new Error(String(cause))
      setError(failure)
      throw failure
    } finally {
      setIsCompressing(false)
    }
  }, [])

  return { compress, isCompressing, stats, error }
}

export interface ImageCropState {
  /** Pan offset, in the units of your crop UI. */
  position: { x: number; y: number }
  zoom: number
  /** Degrees, clockwise. */
  rotation: number
  flipHorizontal: boolean
  flipVertical: boolean
  /** Crop rectangle in source-image pixels, reported by the crop UI. */
  area: CropArea | null
}

const INITIAL_CROP: ImageCropState = {
  position: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  area: null,
}

export interface UseImageCropOptions {
  minZoom?: number
  maxZoom?: number
}

/**
 * UI-agnostic crop/rotate/zoom state with an `apply` that renders the
 * result. Pair it with any crop UI (react-easy-crop, a canvas, sliders).
 */
export function useImageCrop({
  minZoom = 1,
  maxZoom = 4,
}: UseImageCropOptions = {}) {
  const [state, setState] = React.useState<ImageCropState>(INITIAL_CROP)

  const actions = React.useMemo(
    () => ({
      setPosition: (position: { x: number; y: number }) =>
        setState((s) => ({ ...s, position })),
      setZoom: (zoom: number) =>
        setState((s) => ({
          ...s,
          zoom: Math.min(maxZoom, Math.max(minZoom, zoom)),
        })),
      setRotation: (rotation: number) =>
        setState((s) => ({ ...s, rotation: ((rotation % 360) + 360) % 360 })),
      rotateBy: (degrees: number) =>
        setState((s) => ({
          ...s,
          rotation: (((s.rotation + degrees) % 360) + 360) % 360,
        })),
      flip: (axis: "horizontal" | "vertical") =>
        setState((s) =>
          axis === "horizontal"
            ? { ...s, flipHorizontal: !s.flipHorizontal }
            : { ...s, flipVertical: !s.flipVertical }
        ),
      setArea: (area: CropArea | null) => setState((s) => ({ ...s, area })),
      reset: () => setState(INITIAL_CROP),
    }),
    [minZoom, maxZoom]
  )

  const apply = React.useCallback(
    (
      file: File,
      options: Omit<ImageTransformOptions, "crop" | "rotate"> = {}
    ) =>
      transformImage(file, {
        ...options,
        crop: state.area ?? undefined,
        rotate: state.rotation,
        flipHorizontal: state.flipHorizontal,
        flipVertical: state.flipVertical,
      }),
    [state]
  )

  return { ...state, ...actions, minZoom, maxZoom, apply }
}
