"use client"

import * as React from "react"
import type { ImageTransformOptions } from "@uploadcn/core/image"
import { useFilePreview, useImageCrop } from "@uploadcn/react"
import { cn } from "cn"
import Cropper from "react-easy-crop"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  NativeButton,
  UploadModal,
  UploadModalDescription,
  UploadModalFooter,
  UploadModalHeader,
  UploadModalTitle,
  UploadSpinner,
} from "@/registry/default/ui/upload"

interface ImageCropperProps {
  /** The image to crop. The dialog opens while a file is set. */
  file: File | null
  /** Called with the cropped image. */
  onCrop: (file: File) => void
  /** Called when the user dismisses the dialog without cropping. */
  onCancel: () => void
  /** Width / height. Default `1`. */
  aspect?: number
  cropShape?: "rect" | "round"
  /** Output size and encoding for the cropped image. */
  output?: Omit<
    ImageTransformOptions,
    "crop" | "rotate" | "flipHorizontal" | "flipVertical"
  >
  title?: React.ReactNode
  description?: React.ReactNode
  className?: string
}

function ImageCropper({
  file,
  onCrop,
  onCancel,
  aspect = 1,
  cropShape = "rect",
  output,
  title = "Crop image",
  description = "Drag to reposition. Use the slider, scroll or pinch to zoom.",
  className,
}: ImageCropperProps) {
  const url = useFilePreview(file)
  const crop = useImageCrop({ minZoom: 1, maxZoom: 4 })
  const [isApplying, setIsApplying] = React.useState(false)
  const { reset } = crop

  React.useEffect(() => {
    if (file) reset()
  }, [file, reset])

  async function apply() {
    if (!file) return
    setIsApplying(true)
    try {
      onCrop(
        await crop.apply(file, { maxWidth: 2048, maxHeight: 2048, ...output })
      )
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <UploadModal
      open={file !== null}
      onOpenChange={(open) => {
        if (!open && !isApplying) onCancel()
      }}
      data-slot="image-cropper"
      className={cn("sm:max-w-lg", className)}
    >
      <UploadModalHeader>
        <UploadModalTitle>{title}</UploadModalTitle>
        <UploadModalDescription>{description}</UploadModalDescription>
      </UploadModalHeader>
      <div className="relative h-72 overflow-hidden rounded-lg bg-muted">
        {url ? (
          <Cropper
            image={url}
            crop={crop.position}
            zoom={crop.zoom}
            rotation={crop.rotation}
            aspect={aspect}
            cropShape={cropShape}
            minZoom={crop.minZoom}
            maxZoom={crop.maxZoom}
            showGrid={cropShape === "rect"}
            transform={`translate(${crop.position.x}px, ${crop.position.y}px) rotate(${crop.rotation}deg) scale(${crop.zoom * (crop.flipHorizontal ? -1 : 1)}, ${crop.zoom * (crop.flipVertical ? -1 : 1)})`}
            onCropChange={crop.setPosition}
            onZoomChange={crop.setZoom}
            onRotationChange={crop.setRotation}
            onCropComplete={(_, pixels) => crop.setArea(pixels)}
            cropperProps={{
              "aria-label": "Crop area. Use arrow keys to move.",
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <UploadSpinner />
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <IconPlaceholder
          lucide="ZoomOutIcon"
          tabler="IconZoomOut"
          hugeicons="ZoomOutAreaIcon"
          phosphor="MagnifyingGlassMinusIcon"
          remixicon="RiSearchEyeLine"
          aria-hidden
          className="size-4 text-muted-foreground"
        />
        {/* A native range input is fully accessible with Radix and Base UI alike. */}
        <input
          type="range"
          aria-label="Zoom"
          min={crop.minZoom}
          max={crop.maxZoom}
          step={0.01}
          value={crop.zoom}
          onChange={(event) => crop.setZoom(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer accent-primary"
        />
        <IconPlaceholder
          lucide="ZoomInIcon"
          tabler="IconZoomIn"
          hugeicons="ZoomInAreaIcon"
          phosphor="MagnifyingGlassPlusIcon"
          remixicon="RiZoomInLine"
          aria-hidden
          className="size-4 text-muted-foreground"
        />
      </div>
      <UploadModalFooter className="sm:justify-between">
        <div className="flex gap-1">
          <NativeButton
            variant="outline"
            size="icon-sm"
            aria-label="Rotate left"
            onClick={() => crop.rotateBy(-90)}
          >
            <IconPlaceholder
              lucide="RotateCcwIcon"
              tabler="IconRotate"
              hugeicons="ArrowTurnBackwardIcon"
              phosphor="ArrowCounterClockwiseIcon"
              remixicon="RiArrowGoBackLine"
            />
          </NativeButton>
          <NativeButton
            variant="outline"
            size="icon-sm"
            aria-label="Rotate right"
            onClick={() => crop.rotateBy(90)}
          >
            <IconPlaceholder
              lucide="RotateCwIcon"
              tabler="IconRotateClockwise2"
              hugeicons="Rotate01Icon"
              phosphor="ArrowClockwiseIcon"
              remixicon="RiRefreshLine"
            />
          </NativeButton>
          <NativeButton
            variant="outline"
            size="icon-sm"
            aria-label="Flip horizontally"
            aria-pressed={crop.flipHorizontal}
            onClick={() => crop.flip("horizontal")}
          >
            <IconPlaceholder
              lucide="FlipHorizontal2Icon"
              tabler="IconFlipVertical"
              hugeicons="FlipHorizontalIcon"
              phosphor="FlipHorizontalIcon"
              remixicon="RiFlipHorizontalLine"
            />
          </NativeButton>
        </div>
        <div className="flex gap-2">
          <NativeButton
            variant="outline"
            onClick={onCancel}
            disabled={isApplying}
          >
            Cancel
          </NativeButton>
          <NativeButton onClick={apply} disabled={isApplying || !crop.area}>
            {isApplying ? <UploadSpinner data-icon="inline-start" /> : null}
            Apply
          </NativeButton>
        </div>
      </UploadModalFooter>
    </UploadModal>
  )
}

export { ImageCropper, type ImageCropperProps }
