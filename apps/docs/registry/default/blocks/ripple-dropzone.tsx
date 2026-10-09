"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import { useUploadContext, type UploadRootProps } from "@uploadcn/react"
import { cn } from "cn"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

interface RippleDropzoneProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  title?: React.ReactNode
  description?: React.ReactNode
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * A dropzone with a pulse: rings ripple out while files are dragged over it,
 * and a burst confirms the drop.
 */
function RippleDropzone<TResult = unknown>({
  adapter,
  uploader,
  title = "Drop to upload",
  description = "Drag files here, or click to browse",
  className,
  ...options
}: RippleDropzoneProps<TResult>) {
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
        render={(props, state) => (
          <div {...props}>
            <Ripples dragging={state.isDragging} reject={state.isDragReject} />
            {props.children as React.ReactNode}
          </div>
        )}
      >
        <UploadDropzoneTitle className="mt-2">{title}</UploadDropzoneTitle>
        <UploadDropzoneDescription>{description}</UploadDropzoneDescription>
      </UploadDropzone>
      <UploadQueue />
    </Upload>
  )
}

function Ripples({ dragging, reject }: { dragging: boolean; reject: boolean }) {
  const { uploader } = useUploadContext()
  const reduceMotion = useReducedMotion()
  const [bursts, setBursts] = React.useState<number[]>([])

  React.useEffect(
    () =>
      uploader.on("add", () => {
        if (!reduceMotion) setBursts((current) => [...current, Date.now()])
      }),
    [uploader, reduceMotion]
  )

  return (
    <div
      aria-hidden
      className="relative flex size-14 items-center justify-center"
    >
      {dragging && !reduceMotion
        ? [0, 1, 2].map((ring) => (
            <motion.span
              key={ring}
              className={cn(
                "absolute inset-0 rounded-full border",
                reject ? "border-destructive/60" : "border-primary/40"
              )}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2.6, opacity: 0 }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                delay: ring * 0.5,
                ease: "easeOut",
              }}
            />
          ))
        : null}
      <AnimatePresence>
        {bursts.map((burst) => (
          <motion.span
            key={burst}
            className="absolute inset-0 rounded-full bg-primary/25"
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            onAnimationComplete={() =>
              setBursts((current) => current.filter((item) => item !== burst))
            }
          />
        ))}
      </AnimatePresence>
      <motion.span
        className={cn(
          "relative flex size-14 items-center justify-center rounded-full border bg-background shadow-sm transition-colors",
          dragging && !reject && "border-primary text-foreground",
          reject && "border-destructive text-destructive"
        )}
        animate={reduceMotion ? undefined : { scale: dragging ? 1.12 : 1 }}
        transition={{ type: "spring", bounce: 0.45, duration: 0.5 }}
      >
        <motion.span
          className="flex"
          animate={reduceMotion || !dragging ? { y: 0 } : { y: [0, -4, 0] }}
          transition={
            dragging
              ? { repeat: Infinity, duration: 0.9, ease: "easeInOut" }
              : { duration: 0.2 }
          }
        >
          <IconPlaceholder
            lucide="ArrowUpIcon"
            tabler="IconArrowUp"
            hugeicons="ArrowUpIcon"
            phosphor="ArrowUpIcon"
            remixicon="RiArrowUpLine"
            className="size-5"
          />
        </motion.span>
      </motion.span>
    </div>
  )
}

export { RippleDropzone, type RippleDropzoneProps }
