"use client"

import * as React from "react"
import {
  formatSpeed,
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
import { motion, useReducedMotion } from "motion/react"

import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadProgress,
} from "@/registry/default/ui/upload"

interface UploadOdometerProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * Upload stats on rolling digits, files, megabytes and percent tick
 * over like an odometer. Pairs well with dashboards and batch jobs.
 */
function UploadOdometer<TResult = unknown>({
  adapter,
  uploader,
  className,
  ...options
}: UploadOdometerProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, ...options }) as UploadRootProps<TResult>)}
      className={className}
    >
      <Stats />
      <UploadProgress />
      <UploadDropzone size="sm" variant="muted">
        <UploadDropzoneTitle>Drop a batch of files</UploadDropzoneTitle>
        <UploadDropzoneDescription>
          Watch the counters roll
        </UploadDropzoneDescription>
      </UploadDropzone>
    </Upload>
  )
}

function Digit({ value }: { value: number }) {
  const reduceMotion = useReducedMotion()
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={false}
        animate={{ y: `${-value * 10}%` }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", bounce: 0.15, duration: 0.6 }
        }
      >
        {Array.from({ length: 10 }, (_, digit) => (
          <span
            key={digit}
            className="flex h-[1em] items-center justify-center"
          >
            {digit}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

function Rolling({ value, digits }: { value: number; digits: number }) {
  const text = Math.max(0, Math.floor(value)).toString().padStart(digits, "0")
  return (
    <span className="inline-flex leading-none tabular-nums" aria-hidden>
      {text.split("").map((char, index) => (
        <Digit key={text.length - index} value={Number(char)} />
      ))}
    </span>
  )
}

function Stat({
  label,
  value,
  digits,
  unit,
  className,
}: {
  label: string
  value: number
  digits: number
  unit?: string
  className?: string
}) {
  return (
    <div className={cn("cn-upload-card flex flex-col gap-1.5", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-1 text-3xl font-semibold tracking-tight">
        <Rolling value={value} digits={digits} />
        {unit ? (
          <span className="text-sm font-normal text-muted-foreground">
            {unit}
          </span>
        ) : null}
        <span className="sr-only">
          {Math.floor(value)} {unit}
        </span>
      </span>
    </div>
  )
}

function Stats() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Files" value={summary.counts.success} digits={2} />
        <Stat
          label="Uploaded"
          value={summary.loaded / 1_000_000}
          digits={3}
          unit="MB"
        />
        <Stat
          label="Progress"
          value={summary.isComplete ? 100 : summary.percent}
          digits={3}
          unit="%"
        />
      </div>
      <p
        className="h-4 text-xs text-muted-foreground tabular-nums"
        aria-live="off"
      >
        {summary.isUploading && summary.speed
          ? formatSpeed(summary.speed)
          : null}
      </p>
    </div>
  )
}

export { UploadOdometer, type UploadOdometerProps }
