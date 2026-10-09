"use client"

import * as React from "react"
import {
  formatBytes,
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import {
  useUploadContext,
  useUploadProgress,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
} from "@/registry/default/ui/upload"

interface FolderUploadProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Folder name shown on the tab. */
  name?: string
  title?: React.ReactNode
  description?: React.ReactNode
  onSuccess?: (item: UploadItemData<TResult>) => void
  onComplete?: (items: UploadItemData<TResult>[]) => void
  className?: string
}

/**
 * A folder that opens when you hover or drag files over it. Dropped files
 * fly into the folder, and its front shows the upload progress.
 */
function FolderUpload<TResult = unknown>({
  adapter,
  uploader,
  name = "Uploads",
  title = "Drop files into the folder",
  description = "or click to browse",
  className,
  ...options
}: FolderUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            ...options,
          }) as UploadRootProps<TResult>)}
      className={cn("items-center", className)}
    >
      <UploadDropzone
        variant="muted"
        size="lg"
        className="max-w-sm bg-transparent hover:bg-transparent data-dragging:bg-muted/40 data-dragging:ring-0"
      >
        <Folder name={name} />
        <div className="flex flex-col items-center gap-1">
          <UploadDropzoneTitle>{title}</UploadDropzoneTitle>
          <FolderCaption fallback={description} />
        </div>
      </UploadDropzone>
    </Upload>
  )
}

interface FlyingFile {
  id: string
  name: string
  x: number
  rotate: number
}

function Folder({ name }: { name: string }) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const reduceMotion = useReducedMotion()
  const [flying, setFlying] = React.useState<FlyingFile[]>([])
  const [gulp, setGulp] = React.useState(0)

  React.useEffect(
    () =>
      uploader.on("add", ({ items }) => {
        if (reduceMotion) return
        setFlying((current) => [
          ...current,
          ...items.slice(0, 6).map((item, index) => ({
            id: item.id,
            name: item.name,
            x: (index - (Math.min(items.length, 6) - 1) / 2) * 28,
            rotate: (index % 2 === 0 ? -1 : 1) * (4 + index * 2),
          })),
        ])
      }),
    [uploader, reduceMotion]
  )

  const active = summary.isUploading
  const done = summary.isComplete

  return (
    <div
      aria-hidden
      className="relative h-48 w-60 select-none [perspective:900px]"
    >
      {/* Back panel with the tab */}
      <div className="absolute inset-x-0 bottom-0 h-40 rounded-2xl rounded-tl-none bg-primary/80 shadow-sm">
        <div className="absolute -top-5 left-0 flex h-6 w-24 items-center rounded-t-xl bg-primary/80 px-3">
          <span className="truncate text-xs font-medium text-primary-foreground/80">
            {name}
          </span>
        </div>
      </div>

      {/* Papers peeking out */}
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            "absolute inset-x-5 bottom-2 h-36 rounded-lg border bg-background p-3 shadow-xs transition-transform duration-300 ease-out motion-reduce:transition-none",
            "group-hover/upload-dropzone:-translate-y-3 group-data-dragging/upload-dropzone:-translate-y-8",
            index === 0 &&
              "-rotate-3 group-data-dragging/upload-dropzone:-rotate-6",
            index === 1 &&
              "rotate-2 group-data-dragging/upload-dropzone:rotate-4",
            index === 2 && "rotate-0"
          )}
          style={{ transitionDelay: `${index * 40}ms` }}
        >
          <div className="h-1.5 w-12 rounded-full bg-muted" />
          <div className="mt-1.5 h-1.5 w-20 rounded-full bg-muted" />
          <div className="mt-1.5 h-1.5 w-16 rounded-full bg-muted" />
        </div>
      ))}

      {/* Files flying in */}
      <AnimatePresence>
        {flying.map((file) => (
          <motion.div
            key={file.id}
            className="absolute top-0 left-1/2 z-10 flex h-9 w-28 -translate-x-1/2 items-center gap-1.5 rounded-md border bg-background px-2 text-xs font-medium shadow-md"
            initial={{ x: 0, y: -70, opacity: 0, rotate: 0, scale: 1 }}
            animate={{
              x: file.x,
              y: [-70, -40, 70],
              opacity: [0, 1, 1],
              rotate: file.rotate,
              scale: [1, 1, 0.7],
            }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{
              duration: 0.75,
              times: [0, 0.35, 1],
              ease: "easeInOut",
            }}
            onAnimationComplete={() => {
              setFlying((current) =>
                current.filter((item) => item.id !== file.id)
              )
              setGulp((value) => value + 1)
            }}
          >
            <span className="size-3 shrink-0 rounded-sm bg-primary/70" />
            <span className="truncate">{file.name}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Front panel: tilts open on hover and drag */}
      <motion.div
        key={gulp}
        initial={reduceMotion || gulp === 0 ? false : { scale: 1 }}
        animate={
          reduceMotion || gulp === 0 ? undefined : { scale: [1, 1.04, 1] }
        }
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="absolute inset-x-0 bottom-0 z-20 h-28 origin-bottom"
      >
        <div
          className={cn(
            "flex size-full origin-bottom flex-col justify-end rounded-2xl bg-primary p-4 shadow-lg transition-transform duration-300 ease-out motion-reduce:transition-none",
            "group-hover/upload-dropzone:[transform:rotateX(-14deg)] group-data-dragging/upload-dropzone:[transform:rotateX(-32deg)]"
          )}
        >
          <div className="flex items-center justify-between text-xs font-medium text-primary-foreground/85 tabular-nums">
            <span>
              {summary.total === 0
                ? "Empty"
                : `${summary.total} file${summary.total === 1 ? "" : "s"}`}
            </span>
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.span
                  key="done"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex size-4 items-center justify-center rounded-full bg-primary-foreground text-primary"
                >
                  <IconPlaceholder
                    lucide="CheckIcon"
                    tabler="IconCheck"
                    hugeicons="Tick02Icon"
                    phosphor="CheckIcon"
                    remixicon="RiCheckLine"
                    className="size-3"
                    strokeWidth={3}
                  />
                </motion.span>
              ) : active ? (
                <motion.span
                  key="percent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {Math.round(summary.percent)}%
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-primary-foreground/20">
            <div
              className="h-full rounded-full bg-primary-foreground transition-[width] duration-300 ease-out"
              style={{ width: `${summary.percent}%` }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function FolderCaption({ fallback }: { fallback: React.ReactNode }) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  if (summary.total === 0) {
    return <UploadDropzoneDescription>{fallback}</UploadDropzoneDescription>
  }
  return (
    <UploadDropzoneDescription className="tabular-nums">
      {summary.isComplete
        ? `${summary.counts.success} file${summary.counts.success === 1 ? "" : "s"} uploaded · ${formatBytes(summary.size)}`
        : summary.hasErrors
          ? `${summary.counts.error} failed · ${summary.counts.success} uploaded`
          : `Uploading ${formatBytes(summary.loaded)} of ${formatBytes(summary.size)}`}
    </UploadDropzoneDescription>
  )
}

export { FolderUpload, type FolderUploadProps }
