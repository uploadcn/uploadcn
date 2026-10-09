"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import {
  useUploadContext,
  useUploadProgress,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { Badge } from "@/components/ui/badge"
import {
  NativeButton,
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

interface AssignmentSubmissionProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  course?: string
  title?: string
  due: Date
  points?: number
  accept?: string
  /** Called on "Turn in"; return a promise to show a pending state. */
  onSubmit?: (files: UploadItemData<TResult>[]) => void | Promise<void>
  onUnsubmit?: () => void
  className?: string
}

function formatDue(due: Date, now: number) {
  const ms = due.getTime() - now
  const abs = Math.abs(ms)
  const hours = Math.floor(abs / 3_600_000)
  const days = Math.floor(hours / 24)
  const span =
    days >= 1
      ? `${days}d ${hours % 24}h`
      : `${hours}h ${Math.floor(abs / 60_000) % 60}m`
  return ms >= 0 ? `Due in ${span}` : `${span} late`
}

/**
 * Coursework hand-in, like a learning platform: attach work, turn it in,
 * and unsubmit to make changes. Shows the deadline and flags late work.
 */
function AssignmentSubmission<TResult = unknown>({
  adapter,
  uploader,
  course = "Design Systems 201",
  title = "Final project: component audit",
  due,
  points = 100,
  accept,
  onSubmit,
  onUnsubmit,
  className,
}: AssignmentSubmissionProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, accept, maxFiles: 10 }) as UploadRootProps<TResult>)}
      className={className}
    >
      <Submission
        course={course}
        title={title}
        due={due}
        points={points}
        onSubmit={onSubmit as AssignmentSubmissionProps<unknown>["onSubmit"]}
        onUnsubmit={onUnsubmit}
      />
    </Upload>
  )
}

let currentTime = Date.now()

function subscribeToTime(onChange: () => void) {
  const timer = setInterval(() => {
    currentTime = Date.now()
    onChange()
  }, 30_000)
  return () => clearInterval(timer)
}

/** The current time, refreshed every 30s. `null` while server rendering. */
function useNow() {
  return React.useSyncExternalStore(
    subscribeToTime,
    () => currentTime,
    () => null
  )
}

function Submission({
  course,
  title,
  due,
  points,
  onSubmit,
  onUnsubmit,
}: {
  course: string
  title: string
  due: Date
  points: number
  onSubmit?: AssignmentSubmissionProps<unknown>["onSubmit"]
  onUnsubmit?: () => void
}) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const files = useUploadSelector(uploader, (state) =>
    state.items.filter((item) => item.status === "success")
  )
  const [state, setState] = React.useState<
    "draft" | "submitting" | "submitted"
  >("draft")
  const [submittedAt, setSubmittedAt] = React.useState<number | null>(null)
  const now = useNow()
  const late = now != null && (submittedAt ?? now) > due.getTime()

  const turnIn = async () => {
    setState("submitting")
    try {
      await onSubmit?.(files)
      setSubmittedAt(Date.now())
      setState("submitted")
    } catch {
      setState("draft")
    }
  }

  return (
    <div className="cn-upload-card flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{course}</span>
          <h3 className="cn-upload-card-title">{title}</h3>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconPlaceholder
              lucide="CalendarClockIcon"
              tabler="IconCalendarTime"
              hugeicons="Calendar03Icon"
              phosphor="CalendarDotsIcon"
              remixicon="RiCalendarScheduleLine"
              className="size-3.5"
            />
            {now != null
              ? due.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : null}
            {now != null && state !== "submitted"
              ? ` · ${formatDue(due, now)}`
              : null}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={state === "submitted" ? "default" : "secondary"}>
            {state === "submitted" ? "Turned in" : "Assigned"}
          </Badge>
          {late ? <Badge variant="destructive">Late</Badge> : null}
          <span className="text-xs text-muted-foreground tabular-nums">
            {points} pts
          </span>
        </div>
      </div>

      {state === "submitted" ? (
        <div className="flex animate-in flex-col items-center gap-2 rounded-lg bg-muted/60 py-6 text-center fade-in-0 motion-reduce:animate-none">
          <IconPlaceholder
            lucide="CircleCheckIcon"
            tabler="IconCircleCheckFilled"
            hugeicons="CheckmarkCircle01Icon"
            phosphor="CheckCircleIcon"
            remixicon="RiCheckboxCircleFill"
            className="size-6"
          />
          <p className="text-sm font-medium">
            Turned in {files.length} file{files.length === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(submittedAt!).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
      ) : (
        <>
          <UploadDropzone size="sm" className="py-8">
            <IconPlaceholder
              lucide="UploadIcon"
              tabler="IconUpload"
              hugeicons="Upload01Icon"
              phosphor="UploadSimpleIcon"
              remixicon="RiUploadLine"
              className="size-5 text-muted-foreground"
            />
            <UploadDropzoneTitle>Add your work</UploadDropzoneTitle>
            <UploadDropzoneDescription>
              Drop files or click to browse
            </UploadDropzoneDescription>
          </UploadDropzone>
          <UploadQueue size="sm" variant="muted" />
        </>
      )}

      <div className="flex justify-end gap-2 border-t pt-4">
        {state === "submitted" ? (
          <NativeButton
            variant="outline"
            onClick={() => {
              setState("draft")
              setSubmittedAt(null)
              onUnsubmit?.()
            }}
          >
            Unsubmit
          </NativeButton>
        ) : (
          <NativeButton
            disabled={
              files.length === 0 ||
              summary.isUploading ||
              state === "submitting"
            }
            onClick={turnIn}
          >
            {state === "submitting"
              ? "Turning in…"
              : summary.isUploading
                ? "Uploading…"
                : files.length === 0
                  ? "Add a file to turn in"
                  : `Turn in ${files.length} file${files.length === 1 ? "" : "s"}`}
          </NativeButton>
        )}
      </div>
    </div>
  )
}

export { AssignmentSubmission, type AssignmentSubmissionProps }
