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
import { Upload } from "@/registry/default/ui/upload"

interface PaperPlaneButtonProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  children?: React.ReactNode
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * A send button with a payoff: it fills while files upload, then the
 * paper plane takes off and the label lands on "Sent".
 */
function PaperPlaneButton<TResult = unknown>({
  adapter,
  uploader,
  children = "Send files",
  className,
  ...options
}: PaperPlaneButtonProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, ...options }) as UploadRootProps<TResult>)}
      className={cn("w-auto items-start", className)}
    >
      <PlaneTrigger label={children} />
    </Upload>
  )
}

function PlaneTrigger({ label }: { label: React.ReactNode }) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const reduceMotion = useReducedMotion()
  const phase = summary.isUploading
    ? "sending"
    : summary.total > 0 && summary.isComplete
      ? "sent"
      : summary.hasErrors
        ? "error"
        : "idle"

  return (
    <UploadPrimitive.Trigger
      data-phase={phase}
      aria-live="polite"
      className="group/plane relative inline-flex h-10 min-w-36 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-transform outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 data-[phase=error]:bg-destructive data-[phase=error]:text-primary-foreground"
      onClick={() => {
        if (phase === "sent") uploader.clearCompleted()
      }}
    >
      {/* Fill */}
      <motion.span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-primary-foreground/20"
        initial={false}
        animate={{
          width:
            phase === "sending"
              ? `${summary.percent}%`
              : phase === "sent"
                ? "100%"
                : "0%",
          opacity: phase === "sent" ? 0 : 1,
        }}
        transition={{ ease: "easeOut", duration: 0.3 }}
      />
      <span className="relative size-4">
        <AnimatePresence initial={false}>
          {phase !== "sent" ? (
            <motion.span
              key="plane"
              className="absolute inset-0"
              initial={{ x: -16, y: 16, opacity: 0 }}
              animate={
                phase === "sending" && !reduceMotion
                  ? { x: [0, 1.5, 0], y: [0, -1.5, 0], opacity: 1 }
                  : { x: 0, y: 0, opacity: 1 }
              }
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { x: 60, y: -40, rotate: 12, opacity: 0, scale: 0.6 }
              }
              transition={
                phase === "sending"
                  ? { repeat: Infinity, duration: 0.9 }
                  : { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
              }
            >
              <IconPlaceholder
                lucide="SendIcon"
                tabler="IconSend"
                hugeicons="SentIcon"
                phosphor="PaperPlaneTiltIcon"
                remixicon="RiSendPlaneLine"
                className="size-4"
                aria-hidden
              />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={phase}
          className="relative tabular-nums"
          initial={{ y: 12, opacity: 0, filter: "blur(4px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -12, opacity: 0, filter: "blur(4px)" }}
          transition={{
            duration: 0.25,
            delay: phase === "sent" && !reduceMotion ? 0.25 : 0,
          }}
        >
          {phase === "sending"
            ? `Sending… ${Math.round(summary.percent)}%`
            : phase === "sent"
              ? "Sent, send more"
              : phase === "error"
                ? "Failed, try again"
                : label}
        </motion.span>
      </AnimatePresence>
    </UploadPrimitive.Trigger>
  )
}

export { PaperPlaneButton, type PaperPlaneButtonProps }
