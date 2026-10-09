"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import {
  UploadItemContext,
  useUploadContext,
  useUploadProgress,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  Upload,
  UploadDropzone,
  UploadItemMedia,
} from "@/registry/default/ui/upload"

interface OrbitUploadProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

const RADIUS = 92

/**
 * Files orbit the center while they upload, each finished file lands in
 * a tidy row below.
 */
function OrbitUpload<TResult = unknown>({
  adapter,
  uploader,
  className,
  ...options
}: OrbitUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, ...options }) as UploadRootProps<TResult>)}
      className={cn("items-center", className)}
    >
      <Orbit />
    </Upload>
  )
}

function Orbit() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const items = useUploadSelector(uploader, (state) =>
    state.items.filter(
      (item) => item.status !== "rejected" && item.status !== "cancelled"
    )
  )
  const reduceMotion = useReducedMotion()
  const orbiting = items.filter((item) => item.status !== "success").slice(0, 8)
  const landed = items.filter((item) => item.status === "success")

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <UploadDropzone
        variant="muted"
        className="relative size-64 rounded-full bg-transparent p-0 hover:bg-transparent data-dragging:bg-transparent data-dragging:ring-0"
      >
        {/* Rings */}
        <span
          aria-hidden
          className="absolute inset-4 rounded-full border border-dashed transition-colors group-data-dragging/upload-dropzone:border-primary"
        />
        <span aria-hidden className="absolute inset-16 rounded-full border" />
        {/* Planet */}
        <span className="relative flex size-20 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-300 group-hover/upload-dropzone:scale-105 group-data-dragging/upload-dropzone:scale-110">
          {summary.isUploading ? (
            <span className="text-lg font-semibold tabular-nums">
              {Math.round(summary.percent)}%
            </span>
          ) : (
            <IconPlaceholder
              lucide="PlusIcon"
              tabler="IconPlus"
              hugeicons="Add01Icon"
              phosphor="PlusIcon"
              remixicon="RiAddLine"
              className="size-6"
              aria-hidden
            />
          )}
          <span className="sr-only">
            {summary.isUploading
              ? `${Math.round(summary.percent)}% uploaded`
              : "Add files"}
          </span>
        </span>
        {/* Moons */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          animate={
            reduceMotion || orbiting.length === 0 ? undefined : { rotate: 360 }
          }
          transition={{ repeat: Infinity, ease: "linear", duration: 14 }}
        >
          <AnimatePresence>
            {orbiting.map((item, index) => {
              const angle = (index / orbiting.length) * Math.PI * 2
              return (
                <UploadItemContext.Provider key={item.id} value={item}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: Math.cos(angle) * RADIUS,
                      y: Math.sin(angle) * RADIUS,
                    }}
                    exit={{ opacity: 0, scale: 0.4, x: 0, y: RADIUS * 1.6 }}
                    transition={{ type: "spring", bounce: 0.3, duration: 0.7 }}
                    className="absolute top-1/2 left-1/2 -mt-5 -ml-5 size-10"
                  >
                    <UploadItemMedia className="size-10 rounded-full bg-background shadow-sm" />
                    <svg
                      viewBox="0 0 44 44"
                      className="absolute -inset-0.5 size-11 -rotate-90"
                    >
                      <circle
                        cx="22"
                        cy="22"
                        r="20"
                        fill="none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        pathLength={100}
                        strokeDasharray="100"
                        strokeDashoffset={100 - item.progress.percent}
                        className="stroke-primary transition-[stroke-dashoffset] duration-300"
                      />
                    </svg>
                  </motion.div>
                </UploadItemContext.Provider>
              )
            })}
          </AnimatePresence>
        </motion.div>
      </UploadDropzone>
      <ul
        className="flex min-h-10 flex-wrap justify-center gap-1.5"
        aria-label="Uploaded"
      >
        <AnimatePresence initial={false}>
          {landed.map((item) => (
            <UploadItemContext.Provider key={item.id} value={item}>
              <motion.li
                layout
                initial={{ opacity: 0, y: -24, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
                title={item.name}
              >
                <UploadItemMedia className="size-10 rounded-full" />
                <span className="sr-only">{item.name}</span>
              </motion.li>
            </UploadItemContext.Provider>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

export { OrbitUpload, type OrbitUploadProps }
