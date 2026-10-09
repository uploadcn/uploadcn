"use client"

import * as React from "react"
import {
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
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { Upload, UploadDropzone } from "@/registry/default/ui/upload"

interface TypewriterUploadProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Heading typed at the top of the page. */
  title?: string
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

const KEYS = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"]

/**
 * For manuscripts and document submissions: each file name is typed onto a
 * page that rolls out of the machine, with its status written beside it.
 */
function TypewriterUpload<TResult = unknown>({
  adapter,
  uploader,
  title = "Submission",
  accept = [".pdf", ".doc", ".docx", ".txt", ".md", ".rtf", ".odt"],
  className,
  ...options
}: TypewriterUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, accept, ...options }) as UploadRootProps<TResult>)}
      className={cn("w-full max-w-md items-center gap-0", className)}
    >
      <Page title={title} />
      <div
        aria-hidden
        className="relative z-10 h-4 w-full rounded-full bg-foreground shadow-md"
      />
      <UploadDropzone
        variant="outline"
        className="-mt-2 rounded-t-none rounded-b-2xl px-4 pt-6 pb-4"
      >
        <Keys />
      </UploadDropzone>
    </Upload>
  )
}

function Page({ title }: { title: string }) {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) =>
    state.items.filter((item) => item.status !== "cancelled")
  )
  const summary = useUploadProgress(uploader)
  const reduceMotion = useReducedMotion()
  const lines = Math.min(items.length, 6)
  // The page rolls out a line at a time.
  const height = 64 + lines * 28 + (summary.isComplete ? 32 : 0)

  return (
    <motion.div
      className="w-11/12 overflow-hidden rounded-t-md border border-b-0 bg-card font-mono text-xs shadow-sm"
      initial={false}
      animate={{ height }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 120, damping: 20 }
      }
      aria-live="polite"
    >
      <div className="flex flex-col gap-2 px-5 pt-5">
        <p className="text-center font-semibold tracking-widest uppercase">
          <Typed text={title} />
        </p>
        <ol className="flex flex-col gap-2">
          {items.slice(-6).map((item, index) => (
            <Line
              key={item.id}
              item={item}
              number={items.length - lines + index + 1}
            />
          ))}
        </ol>
        <AnimatePresence>
          {summary.isComplete ? (
            <motion.p
              className="pt-1 text-center text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Typed
                text={`[ ${summary.counts.success} filed. End of submission. ]`}
              />
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function Line({ item, number }: { item: UploadItemData; number: number }) {
  const failed = item.status === "error" || item.status === "rejected"
  const status = failed
    ? "returned"
    : item.status === "success"
      ? "filed"
      : `${Math.round(item.progress.percent)}%`
  return (
    <li className="flex items-baseline gap-2">
      <span className="text-muted-foreground tabular-nums">
        {String(number).padStart(2, "0")}.
      </span>
      <span className="min-w-0 flex-1 truncate">
        <Typed text={item.file.name} />
      </span>
      <span
        aria-hidden
        className="min-w-4 flex-1 truncate text-muted-foreground/50"
      >
        ..............................
      </span>
      <span
        className={cn(
          "tabular-nums",
          failed
            ? "text-destructive"
            : item.status === "success"
              ? "font-semibold"
              : "text-muted-foreground"
        )}
      >
        {status}
      </span>
    </li>
  )
}

/** Types `text` a character at a time, with a caret while typing. */
function Typed({ text }: { text: string }) {
  const reduceMotion = useReducedMotion()
  const [count, setCount] = React.useState(0)
  React.useEffect(() => {
    if (reduceMotion) return
    const timer = setInterval(() => {
      setCount((current) => {
        if (current >= text.length) {
          clearInterval(timer)
          return current
        }
        return current + 1
      })
    }, 28)
    return () => clearInterval(timer)
  }, [text, reduceMotion])
  const shown = reduceMotion ? text.length : count
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, shown)}
        {shown < text.length ? (
          <span className="ml-px inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-foreground" />
        ) : null}
      </span>
    </>
  )
}

function Keys() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const reduceMotion = useReducedMotion()
  const typing = summary.isUploading && !reduceMotion
  const [pressed, setPressed] = React.useState(-1)
  React.useEffect(() => {
    if (!typing) return
    const timer = setInterval(
      () => setPressed(Math.floor(Math.random() * KEYS.length)),
      140
    )
    return () => {
      clearInterval(timer)
      setPressed(-1)
    }
  }, [typing])

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div aria-hidden className="flex gap-1.5">
        {KEYS.map((key, index) => (
          <motion.span
            key={key}
            className="flex size-7 items-center justify-center rounded-full border-2 border-foreground/70 bg-background font-mono text-xs font-semibold shadow-sm"
            animate={{ y: pressed === index ? 3 : 0 }}
            transition={{ duration: 0.08 }}
          >
            {key}
          </motion.span>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {summary.total === 0
          ? "Drop your pages here, or click to choose"
          : summary.isUploading
            ? "Typing up your submission…"
            : "Add more pages"}
      </p>
    </div>
  )
}

export { TypewriterUpload, type TypewriterUploadProps }
