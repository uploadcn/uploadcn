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
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadFileIcon,
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
 * fly in and file away as labeled sheets, and its front shows the progress.
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

/** The back panel with its tab, drawn as one path (viewBox 240 × 192). */
const FOLDER_BACK =
  "M0 14A14 14 0 0 1 14 0H80C92 0 94 18 106 18H224A16 16 0 0 1 240 34V176A16 16 0 0 1 224 192H16A16 16 0 0 1 0 176Z"
/** Sheets shown in the folder; older files are counted on the front. */
const VISIBLE_SHEETS = 3
/** How much of each sheet shows above the one in front of it, in px. */
const SHEET_STEP = 24

interface FlyingFile {
  id: string
  name: string
  x: number
  rotate: number
}

function Folder({ name }: { name: string }) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const files = useUploadSelector(uploader, (state) =>
    state.items
      .filter(
        (item) => item.status !== "rejected" && item.status !== "cancelled"
      )
      .slice(-VISIBLE_SHEETS)
  )
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
      className="relative h-56 w-60 select-none [perspective:900px]"
    >
      {/* Back panel and tab: one shape, so the tab flows into the panel. The
          folder is a solid tint of the theme's primary color: soft in light
          mode, lifted off the page in dark mode. */}
      <svg
        viewBox="0 0 240 192"
        className="absolute inset-x-0 bottom-0 h-48 w-full drop-shadow-sm"
      >
        <path d={FOLDER_BACK} className="fill-background" />
        <path
          d={FOLDER_BACK}
          className="fill-primary/25 dark:fill-primary/10"
        />
      </svg>
      <span className="absolute top-8 left-0 flex h-4.5 w-22 items-center px-3 text-xs font-medium text-foreground/70">
        <span className="truncate">{name}</span>
      </span>

      {/* The files in the folder: the newest in front, each older one
          showing its name above it, like sheets in a filing folder */}
      <div className="absolute inset-0 transition-transform duration-300 ease-out group-hover/upload-dropzone:-translate-y-1.5 group-data-dragging/upload-dropzone:-translate-y-5 motion-reduce:transition-none">
        <AnimatePresence initial={false}>
          {files.map((item, index) => {
            const depth = files.length - 1 - index
            return (
              <motion.div
                key={item.id}
                initial={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, y: -SHEET_STEP }
                }
                animate={{
                  opacity: 1,
                  y: -depth * SHEET_STEP,
                  x: depth === 0 ? 0 : depth % 2 === 0 ? 4 : -4,
                  rotate: depth === 0 ? 0 : depth % 2 === 0 ? 1.5 : -1.5,
                }}
                exit={{ opacity: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", bounce: 0.2, duration: 0.5 }
                }
                className="absolute inset-x-4 top-25.5 h-28 rounded-lg border bg-background px-2.5 py-1 shadow-xs dark:bg-muted"
              >
                <UploadItemContext.Provider value={item}>
                  <FolderSheet item={item} />
                </UploadItemContext.Provider>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

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
        className="absolute inset-x-0 bottom-0 z-20 h-24 origin-bottom"
      >
        <div
          className={cn(
            "flex size-full origin-bottom flex-col justify-end rounded-2xl bg-background bg-linear-to-b from-primary/10 to-primary/10 p-4 shadow-lg ring-1 ring-foreground/5 transition-transform duration-300 ease-out motion-reduce:transition-none dark:from-primary/30 dark:to-primary/30",
            "group-hover/upload-dropzone:[transform:rotateX(-14deg)] group-data-dragging/upload-dropzone:[transform:rotateX(-32deg)]"
          )}
        >
          <div className="flex items-center justify-between text-xs font-medium text-foreground/75 tabular-nums">
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
                  className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
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
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${summary.percent}%` }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function FolderSheet({ item }: { item: UploadItemData }) {
  const status =
    item.status === "success"
      ? formatBytes(item.size)
      : item.status === "error"
        ? "Failed"
        : item.status === "paused"
          ? "Paused"
          : item.status === "uploading"
            ? `${Math.round(item.progress.percent)}%`
            : item.status === "processing" || item.status === "scanning"
              ? "Checking"
              : "Waiting"
  return (
    <div className="flex h-4 items-center gap-1.5 text-left text-xs">
      <UploadFileIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
      <span
        className={cn(
          "shrink-0 text-muted-foreground tabular-nums",
          item.status === "error" && "text-destructive"
        )}
      >
        {status}
      </span>
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
