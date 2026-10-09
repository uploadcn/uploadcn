"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import {
  Upload as UploadPrimitive,
  useUploadContext,
  useUploadProgress,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { buttonVariants } from "@/components/ui/button"
import { Upload } from "@/registry/default/ui/upload"

interface UploadMorphButtonProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  children?: React.ReactNode
  multiple?: boolean
  onSuccess?: (item: UploadItemData<TResult>) => void
  onComplete?: (items: UploadItemData<TResult>[]) => void
  className?: string
}

/**
 * A button that morphs into its own progress bar while uploading, then
 * into a check mark, no extra UI needed.
 */
function UploadMorphButton<TResult = unknown>({
  adapter,
  uploader,
  children = "Upload",
  className,
  ...options
}: UploadMorphButtonProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            ...options,
          }) as UploadRootProps<TResult>)}
      className={cn("w-auto items-start", className)}
    >
      <MorphTrigger label={children} />
    </Upload>
  )
}

type Phase = "idle" | "uploading" | "done" | "error"

function MorphTrigger({ label }: { label: React.ReactNode }) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const reduceMotion = useReducedMotion()
  const [showDone, setShowDone] = React.useState(false)

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = uploader.on("complete", ({ items }) => {
      if (!items.some((item) => item.status === "success")) return
      setShowDone(true)
      clearTimeout(timer)
      timer = setTimeout(() => setShowDone(false), 2200)
    })
    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
  }, [uploader])

  const phase: Phase = summary.isUploading
    ? "uploading"
    : showDone
      ? "done"
      : summary.hasErrors
        ? "error"
        : "idle"

  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, bounce: 0.25, duration: 0.5 }

  return (
    <UploadPrimitive.Trigger
      data-slot="upload-morph-button"
      data-phase={phase}
      disabled={phase === "uploading"}
      aria-live="polite"
      render={
        <motion.button
          layout
          transition={spring}
          style={{ borderRadius: 999 }}
          className={cn(
            buttonVariants({ size: "lg" }),
            "relative h-10 overflow-hidden px-5 disabled:opacity-100",
            phase === "done" && "w-10 px-0",
            phase === "error" &&
              "bg-destructive text-white hover:bg-destructive/90"
          )}
        />
      }
    >
      {phase === "uploading" ? (
        <motion.span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-primary-foreground/15"
          initial={{ width: 0 }}
          animate={{ width: `${summary.percent}%` }}
          transition={{ ease: "easeOut", duration: 0.3 }}
        />
      ) : null}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={phase}
          className="relative flex items-center gap-2 whitespace-nowrap"
          initial={
            reduceMotion ? false : { opacity: 0, y: 8, filter: "blur(4px)" }
          }
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={
            reduceMotion
              ? undefined
              : { opacity: 0, y: -8, filter: "blur(4px)" }
          }
          transition={{ duration: 0.2 }}
        >
          {phase === "idle" ? (
            <>
              <IconPlaceholder
                lucide="UploadIcon"
                tabler="IconUpload"
                hugeicons="Upload01Icon"
                phosphor="UploadSimpleIcon"
                remixicon="RiUploadLine"
                data-icon="inline-start"
              />
              {label}
            </>
          ) : phase === "uploading" ? (
            <span className="tabular-nums">
              Uploading {Math.round(summary.percent)}%
            </span>
          ) : phase === "done" ? (
            <DrawnCheck label="Uploaded" />
          ) : (
            <>
              <IconPlaceholder
                lucide="CircleAlertIcon"
                tabler="IconExclamationCircle"
                hugeicons="AlertCircleIcon"
                phosphor="WarningCircleIcon"
                remixicon="RiErrorWarningLine"
                data-icon="inline-start"
              />
              Failed, try again
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </UploadPrimitive.Trigger>
  )
}

function DrawnCheck({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
    >
      <motion.path
        d="M5 12.5l4.5 4.5L19 7.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
      />
    </svg>
  )
}

export { UploadMorphButton, type UploadMorphButtonProps }
