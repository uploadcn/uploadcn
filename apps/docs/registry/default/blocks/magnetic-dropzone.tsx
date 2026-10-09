"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import { type UploadRootProps } from "@uploadcn/react"
import { cn } from "cn"
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

interface MagneticDropzoneProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** How strongly the target follows the pointer, 0–1. Default `0.35`. */
  strength?: number
  showQueue?: boolean
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * A dropzone whose target is magnetic: it leans towards the pointer on
 * hover and follows dragged files, then snaps back with a spring.
 */
function MagneticDropzone<TResult = unknown>({
  adapter,
  uploader,
  strength = 0.35,
  showQueue = true,
  className,
  ...options
}: MagneticDropzoneProps<TResult>) {
  const reduceMotion = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 })
  const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 })

  const follow = (event: React.PointerEvent | React.DragEvent) => {
    if (reduceMotion) return
    const rect = event.currentTarget.getBoundingClientRect()
    x.set((event.clientX - rect.left - rect.width / 2) * strength)
    y.set((event.clientY - rect.top - rect.height / 2) * strength)
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            ...options,
          }) as UploadRootProps<TResult>)}
      className={className}
    >
      <UploadDropzone
        variant="muted"
        size="lg"
        onPointerMove={follow}
        onPointerLeave={reset}
        onDragOver={follow}
        onDragLeave={reset}
        onDrop={reset}
        className="overflow-hidden"
      >
        <motion.div
          aria-hidden
          style={{ x: springX, y: springY }}
          className="relative flex size-16 items-center justify-center"
        >
          <span className="absolute inset-0 rounded-2xl border bg-background shadow-sm transition-[transform,border-radius,box-shadow] duration-300 group-data-dragging/upload-dropzone:scale-125 group-data-dragging/upload-dropzone:rounded-full group-data-dragging/upload-dropzone:border-primary group-data-dragging/upload-dropzone:shadow-lg group-data-dragging/upload-dropzone:shadow-primary/20" />
          <span className="absolute inset-0 -z-10 rounded-full bg-primary/15 opacity-0 blur-xl transition-opacity group-data-dragging/upload-dropzone:opacity-100" />
          <IconPlaceholder
            lucide="UploadIcon"
            tabler="IconUpload"
            hugeicons="Upload01Icon"
            phosphor="UploadSimpleIcon"
            remixicon="RiUploadLine"
            className="relative size-5 transition-all duration-200 group-data-dragging/upload-dropzone:scale-0 group-data-dragging/upload-dropzone:opacity-0"
          />
          <IconPlaceholder
            lucide="ArrowDownIcon"
            tabler="IconArrowDown"
            hugeicons="ArrowDownIcon"
            phosphor="ArrowDownIcon"
            remixicon="RiArrowDownLine"
            className="absolute size-5 scale-0 text-primary opacity-0 transition-all duration-200 group-data-dragging/upload-dropzone:scale-100 group-data-dragging/upload-dropzone:opacity-100"
          />
        </motion.div>
        <div className={cn("flex flex-col items-center gap-1")}>
          <UploadDropzoneTitle>
            <span className="group-data-dragging/upload-dropzone:hidden">
              Drag files here
            </span>
            <span className="hidden group-data-dragging/upload-dropzone:inline">
              Let go to upload
            </span>
          </UploadDropzoneTitle>
          <UploadDropzoneDescription>
            or click anywhere to browse
          </UploadDropzoneDescription>
        </div>
      </UploadDropzone>
      {showQueue ? <UploadQueue size="sm" /> : null}
    </Upload>
  )
}

export { MagneticDropzone, type MagneticDropzoneProps }
