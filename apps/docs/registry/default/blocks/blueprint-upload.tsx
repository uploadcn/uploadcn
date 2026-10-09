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
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react"

import { Upload, UploadDropzone } from "@/registry/default/ui/upload"

interface BlueprintUploadProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Project name in the title block. */
  project?: string
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/** Elevation of a small building, drawn in the order a drafter would. */
const DRAWING = [
  "M40 150 H280",
  "M60 150 V82 L160 32 L260 82 V150",
  "M60 82 H260",
  "M140 150 V108 H180 V150",
  "M84 96 H120 V126 H84 Z M102 96 V126 M84 111 H120",
  "M200 96 H236 V126 H200 Z M218 96 V126 M200 111 H236",
  "M220 58 V36 H238 V67",
]
const DIMENSIONS = [
  "M60 166 H260",
  "M60 162 V170",
  "M260 162 V170",
  "M276 82 V150",
  "M272 82 H280",
  "M272 150 H280",
]

/**
 * For architecture, engineering and CAD files: a drawing traces itself line
 * by line as the files upload, and the title block gets an approval stamp
 * when everything is in.
 */
function BlueprintUpload<TResult = unknown>({
  adapter,
  uploader,
  project = "Project A-104",
  accept = [".pdf", ".dwg", ".dxf", ".ifc", ".step", ".stl", ".svg", "image/*"],
  className,
  ...options
}: BlueprintUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, accept, ...options }) as UploadRootProps<TResult>)}
      className={cn("w-full max-w-xl", className)}
    >
      <UploadDropzone
        variant="outline"
        className="overflow-hidden rounded-xl p-0"
      >
        <Sheet project={project} />
      </UploadDropzone>
    </Upload>
  )
}

function Sheet({ project }: { project: string }) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const items = useUploadSelector(uploader, (state) =>
    state.items.filter((item) => item.status !== "cancelled")
  )
  const reduceMotion = useReducedMotion()
  const id = `blueprint${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const percent = summary.isComplete ? 100 : summary.percent
  const drawn = useSpring(percent / 100, { stiffness: 50, damping: 20 })
  React.useEffect(() => {
    if (reduceMotion) drawn.jump(percent / 100)
    else drawn.set(percent / 100)
  }, [drawn, percent, reduceMotion])
  const approved = summary.isComplete
  const latest = items.at(-1)

  return (
    <div className="flex w-full flex-col bg-muted/40">
      <svg viewBox="0 0 320 190" className="w-full" aria-hidden>
        <defs>
          <pattern
            id={`${id}-grid`}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M16 0 H0 V16"
              fill="none"
              strokeWidth="0.5"
              className="stroke-border"
            />
          </pattern>
        </defs>
        <rect width="320" height="190" fill={`url(#${id}-grid)`} />
        {/* Ghost of the full drawing, so the sheet never looks empty */}
        {DRAWING.map((d) => (
          <path
            key={`ghost-${d}`}
            d={d}
            fill="none"
            strokeWidth="1"
            strokeDasharray="2 3"
            className="stroke-muted-foreground/30"
          />
        ))}
        {DRAWING.map((d, index) => (
          <Stroke
            key={d}
            d={d}
            index={index}
            count={DRAWING.length}
            drawn={drawn}
          />
        ))}
        {DIMENSIONS.map((d) => (
          <motion.path
            key={d}
            d={d}
            fill="none"
            strokeWidth="1"
            className="stroke-primary"
            initial={false}
            animate={{ opacity: approved ? 1 : 0 }}
          />
        ))}
        <motion.text
          x="160"
          y="182"
          textAnchor="middle"
          className="fill-primary font-mono text-xs"
          initial={false}
          animate={{ opacity: approved ? 1 : 0 }}
        >
          12.40 m
        </motion.text>
      </svg>
      <div className="grid grid-cols-4 border-t bg-card font-mono text-xs">
        <Cell label="Project" value={project} className="col-span-2" />
        <Cell
          label="Sheet"
          value={latest ? latest.file.name : "Empty"}
          className="col-span-2 border-l"
        />
        <Cell
          label="Files"
          value={`${summary.counts.success} / ${summary.total}`}
          className="border-t"
        />
        <Cell
          label="Size"
          value={formatBytes(summary.size)}
          className="border-t border-l"
        />
        <div className="relative col-span-2 flex items-center justify-center border-t border-l px-3 py-2">
          <AnimatePresence mode="wait" initial={false}>
            {approved ? (
              <motion.span
                key="approved"
                className="-rotate-6 rounded-sm border-2 border-primary px-2 py-0.5 font-bold tracking-widest text-primary uppercase"
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 400, damping: 15 }
                }
              >
                Approved
              </motion.span>
            ) : (
              <motion.span
                key="status"
                className="text-muted-foreground"
                exit={{ opacity: 0 }}
                aria-live="polite"
              >
                {summary.total === 0
                  ? "Drop drawings or click"
                  : summary.hasErrors && !summary.isUploading
                    ? "Revisions needed"
                    : `Drafting ${Math.round(percent)}%`}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/** One line of the drawing; lines draw one after another as `drawn` grows. */
function Stroke({
  d,
  index,
  count,
  drawn,
}: {
  d: string
  index: number
  count: number
  drawn: ReturnType<typeof useSpring>
}) {
  const length = useTransform(drawn, (value) =>
    Math.min(1, Math.max(0, value * count - index))
  )
  const opacity = useTransform(length, (value) => (value > 0 ? 1 : 0))
  return (
    <motion.path
      d={d}
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="stroke-foreground"
      style={{ pathLength: length, opacity }}
    />
  )
}

function Cell({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col px-3 py-2 text-left", className)}>
      <span className="text-muted-foreground uppercase">{label}</span>
      <span className="truncate">{value}</span>
    </div>
  )
}

export { BlueprintUpload, type BlueprintUploadProps }
