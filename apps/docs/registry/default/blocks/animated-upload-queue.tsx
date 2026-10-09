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
  useUploadItem,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react"

import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadItem,
  UploadItemActions,
  UploadItemContent,
  UploadItemDescription,
  UploadItemMedia,
  UploadItemTitle,
} from "@/registry/default/ui/upload"

interface AnimatedUploadQueueProps<TResult> extends Pick<
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
 * A queue with motion: rows expand in and collapse out, percentages count
 * up smoothly, active bars shimmer and finished rows draw a check mark.
 */
function AnimatedUploadQueue<TResult = unknown>({
  adapter,
  uploader,
  className,
  ...options
}: AnimatedUploadQueueProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            ...options,
          }) as UploadRootProps<TResult>)}
      className={className}
    >
      <UploadDropzone size="sm">
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon" />
          <UploadDropzoneTitle>Drop files to upload</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            Remove a row to see it collapse
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
      </UploadDropzone>
      <Queue />
    </Upload>
  )
}

function Queue() {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) => state.items)
  const reduceMotion = useReducedMotion()

  return (
    <ul role="list" aria-label="Uploads" className="flex flex-col">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <UploadItemContext.Provider key={item.id} value={item}>
            <motion.li
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={
                reduceMotion
                  ? undefined
                  : {
                      opacity: 0,
                      height: 0,
                      x: 24,
                      transition: { duration: 0.22 },
                    }
              }
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="overflow-hidden"
            >
              <div className="pb-2">
                <UploadItem
                  item={item}
                  render={<div />}
                  className="flex-nowrap"
                >
                  <SuccessMedia />
                  <UploadItemContent>
                    <div className="flex items-baseline justify-between gap-3">
                      <UploadItemTitle />
                      <AnimatedPercent />
                    </div>
                    <UploadItemDescription className="line-clamp-1" />
                    <ShimmerProgress />
                  </UploadItemContent>
                  <UploadItemActions />
                </UploadItem>
              </div>
            </motion.li>
          </UploadItemContext.Provider>
        ))}
      </AnimatePresence>
    </ul>
  )
}

function SuccessMedia() {
  const item = useUploadItem()
  if (item.status !== "success") return <UploadItemMedia />
  return (
    <UploadItemMedia className="border-transparent bg-primary text-primary-foreground">
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </svg>
    </UploadItemMedia>
  )
}

function AnimatedPercent() {
  const item = useUploadItem()
  const spring = useSpring(item.progress.percent, { bounce: 0, duration: 400 })
  const text = useTransform(spring, (value) => `${Math.round(value)}%`)

  React.useEffect(() => {
    spring.set(item.status === "success" ? 100 : item.progress.percent)
  }, [spring, item.progress.percent, item.status])

  if (item.status !== "uploading" && item.status !== "paused") return null
  return (
    <motion.span
      aria-hidden
      className="shrink-0 text-xs text-muted-foreground tabular-nums"
    >
      {text}
    </motion.span>
  )
}

function ShimmerProgress() {
  const item = useUploadItem()
  const reduceMotion = useReducedMotion()
  if (item.status !== "uploading" && item.status !== "queued") return null
  return (
    <div className="relative mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={false}
        animate={{ width: `${item.progress.percent}%` }}
        transition={{ ease: "easeOut", duration: 0.3 }}
      />
      {reduceMotion ? null : (
        <motion.div
          aria-hidden
          className="absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-background/55 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "300%" }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
        />
      )}
    </div>
  )
}

export { AnimatedUploadQueue, type AnimatedUploadQueueProps }
