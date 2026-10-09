"use client"

import * as React from "react"
import {
  formatBytes,
  formatDuration,
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
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { Upload, UploadDropzone } from "@/registry/default/ui/upload"

interface RocketUploadProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/** Fixed star positions (percent of the sky), so server and client match. */
const STARS = [
  [8, 14],
  [22, 32],
  [35, 9],
  [48, 24],
  [63, 12],
  [77, 30],
  [90, 16],
  [14, 52],
  [84, 50],
  [70, 62],
  [28, 66],
]

/** How far the rocket climbs during the upload, in pixels. */
const CLIMB = 120

/**
 * For deploys and build artifacts: the rocket climbs with the upload, its
 * engine burning while bytes move, and lifts off into the sky when every
 * file has landed.
 */
function RocketUpload<TResult = unknown>({
  adapter,
  uploader,
  className,
  ...options
}: RocketUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, ...options }) as UploadRootProps<TResult>)}
      className={cn("w-full max-w-md", className)}
    >
      <UploadDropzone
        variant="outline"
        className="h-80 overflow-hidden rounded-2xl bg-muted/40 p-0"
      >
        <LaunchPad />
      </UploadDropzone>
    </Upload>
  )
}

function LaunchPad() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const reduceMotion = useReducedMotion()
  const idle = summary.total === 0
  const launched = summary.isComplete
  const burning = summary.isUploading
  const failed = summary.hasErrors && !summary.isUploading && !launched

  const altitude = useSpring(0, { stiffness: 60, damping: 20 })
  React.useEffect(() => {
    const target = -(summary.percent / 100) * CLIMB
    if (reduceMotion) altitude.jump(target)
    else altitude.set(target)
  }, [altitude, summary.percent, reduceMotion])
  const shadow = useTransform(altitude, [0, -CLIMB], [1, 0.4])

  return (
    <div className="absolute inset-0">
      {STARS.map(([left, top], index) => (
        <motion.span
          key={index}
          aria-hidden
          className="absolute size-1 rounded-full bg-foreground/30"
          style={{ left: `${left}%`, top: `${top}%` }}
          animate={reduceMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 2 + (index % 3),
            repeat: Infinity,
            delay: index * 0.3,
          }}
        />
      ))}

      {/* Status, top left */}
      <div
        className="absolute top-4 left-4 flex flex-col items-start gap-1 text-left"
        aria-live="polite"
      >
        <span className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
          {idle
            ? "Ready on the pad"
            : launched
              ? "Liftoff"
              : failed
                ? "Launch aborted"
                : `T+ ${Math.round(summary.percent)}%`}
        </span>
        <span className="text-sm font-medium">
          {idle
            ? "Drop your build to launch it"
            : launched
              ? `${summary.counts.success} ${summary.counts.success === 1 ? "artifact" : "artifacts"} deployed`
              : failed
                ? "Some files didn't make it"
                : `${formatBytes(summary.loaded)} of ${formatBytes(summary.size)}${
                    summary.eta ? ` · ${formatDuration(summary.eta)} left` : ""
                  }`}
        </span>
      </div>

      {/* Ground and tower */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-10 border-t bg-muted"
      />
      <div
        aria-hidden
        className="absolute bottom-10 left-1/2 ml-10 h-28 w-2 rounded-t-sm bg-muted-foreground/30"
      />
      <div
        aria-hidden
        className="absolute bottom-28 left-1/2 ml-6 h-1 w-6 bg-muted-foreground/30"
      />
      <motion.div
        aria-hidden
        className="absolute bottom-9 left-1/2 h-2 w-16 -translate-x-1/2 rounded-full bg-foreground/20"
        style={{ scaleX: shadow, opacity: shadow }}
      />

      {/* Smoke while the engine burns */}
      <AnimatePresence>
        {burning && !reduceMotion
          ? [0, 1, 2, 3].map((puff) => (
              <motion.span
                key={puff}
                aria-hidden
                className="absolute bottom-8 left-1/2 size-8 rounded-full bg-muted-foreground/20"
                initial={{ opacity: 0, scale: 0.4, x: "-50%" }}
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0.4, 1.6],
                  x: ["-50%", `${(puff % 2 ? 1 : -1) * (60 + puff * 40)}%`],
                }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  delay: puff * 0.4,
                }}
              />
            ))
          : null}
      </AnimatePresence>

      {/* The rocket */}
      <motion.div
        aria-hidden
        className="absolute bottom-10 left-1/2 -ml-7 w-14"
        style={{ y: altitude }}
        animate={
          launched
            ? {
                y: reduceMotion ? -CLIMB : -420,
                transition: { duration: 1.2, ease: "easeIn" },
              }
            : undefined
        }
      >
        <svg viewBox="0 0 56 112" className="w-14 overflow-visible">
          <AnimatePresence>
            {burning || launched ? (
              <motion.path
                d="M20 88 Q28 120 36 88 Z"
                className="fill-primary"
                style={{ originX: "28px", originY: "88px" }}
                initial={{ scaleY: 0 }}
                animate={
                  reduceMotion
                    ? { scaleY: 1 }
                    : { scaleY: launched ? [1.4, 1.8, 1.4] : [0.8, 1.2, 0.8] }
                }
                exit={{ scaleY: 0, transition: { duration: 0.2 } }}
                transition={{
                  duration: 0.25,
                  repeat: reduceMotion ? 0 : Infinity,
                }}
              />
            ) : null}
          </AnimatePresence>
          <path
            d="M28 4 C44 20 44 56 40 84 L16 84 C12 56 12 20 28 4 Z"
            className="fill-foreground"
          />
          <path
            d="M16 60 L4 84 L16 80 Z M40 60 L52 84 L40 80 Z"
            className="fill-primary"
          />
          <circle cx="28" cy="38" r="7" className="fill-background" />
          <circle cx="28" cy="38" r="3.5" className="fill-primary/50" />
          <rect
            x="18"
            y="84"
            width="20"
            height="5"
            rx="1.5"
            className="fill-muted-foreground"
          />
        </svg>
      </motion.div>

      {/* Mission complete */}
      <AnimatePresence>
        {launched ? (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { delay: reduceMotion ? 0 : 0.9 },
            }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <IconPlaceholder
                lucide="CheckIcon"
                tabler="IconCheck"
                hugeicons="Tick02Icon"
                phosphor="CheckIcon"
                remixicon="RiCheckLine"
                className="size-6"
              />
            </span>
            <span className="text-sm font-medium">
              Deployed. Drop more to launch again.
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <span className="sr-only">Drop build files or click to choose them</span>
    </div>
  )
}

export { RocketUpload, type RocketUploadProps }
