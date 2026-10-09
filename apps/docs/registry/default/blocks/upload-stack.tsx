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
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { motion, useReducedMotion } from "motion/react"

import {
  Upload,
  UploadDropzone,
  UploadDropzoneContent,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneTitle,
  UploadItem,
  UploadItemActions,
  UploadItemContent,
  UploadItemDescription,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemTitle,
  UploadTrigger,
} from "@/registry/default/ui/upload"

const CARD_HEIGHT = 64
const GAP = 8
const PEEK = 10
const VISIBLE = 3

interface UploadStackProps<TResult> extends Pick<
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
 * Uploads stacked like notifications. Hover (or focus) the stack to fan it
 * out; the newest file is always on top.
 */
function UploadStack<TResult = unknown>({
  adapter,
  uploader,
  className,
  ...options
}: UploadStackProps<TResult>) {
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
      <UploadDropzone orientation="horizontal" size="sm" clickable={false}>
        <UploadDropzoneHeader className="items-start">
          <UploadDropzoneTitle>Uploads</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            Drop files here. Hover the stack to expand it.
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
        <UploadDropzoneContent>
          <UploadTrigger>Add files</UploadTrigger>
        </UploadDropzoneContent>
      </UploadDropzone>
      <Stack />
    </Upload>
  )
}

function Stack() {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) => state.items)
  const reduceMotion = useReducedMotion()
  const [expanded, setExpanded] = React.useState(false)

  const visible = React.useMemo(
    () => items.filter((item) => item.status !== "cancelled").reverse(),
    [items]
  )
  if (visible.length === 0) return null

  const count = visible.length
  const height = expanded
    ? count * CARD_HEIGHT + (count - 1) * GAP
    : CARD_HEIGHT + Math.min(count - 1, VISIBLE - 1) * PEEK

  return (
    <motion.ul
      role="list"
      aria-label="Uploads"
      className="relative w-full"
      initial={false}
      animate={{ height }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", bounce: 0.15, duration: 0.45 }
      }
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setExpanded(false)
        }
      }}
    >
      {visible.map((item, index) => {
        const hidden = !expanded && index >= VISIBLE
        return (
          <UploadItemContext.Provider key={item.id} value={item}>
            <UploadItem
              item={item}
              className="absolute inset-x-0 top-0 h-16 bg-card shadow-sm"
              render={
                <motion.li
                  initial={
                    reduceMotion ? false : { opacity: 0, y: -24, scale: 0.96 }
                  }
                  animate={{
                    opacity: hidden ? 0 : 1,
                    y: expanded ? index * (CARD_HEIGHT + GAP) : index * PEEK,
                    scale: expanded ? 1 : 1 - Math.min(index, VISIBLE) * 0.05,
                  }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", bounce: 0.2, duration: 0.5 }
                  }
                  style={{
                    zIndex: count - index,
                    transformOrigin: "top center",
                  }}
                  inert={hidden}
                />
              }
            >
              <UploadItemMedia />
              <UploadItemContent>
                <UploadItemTitle />
                <UploadItemDescription className="line-clamp-1" />
              </UploadItemContent>
              <UploadItemActions />
              <UploadItemProgress className="absolute inset-x-3 bottom-1.5 h-0.5 w-auto" />
            </UploadItem>
          </UploadItemContext.Provider>
        )
      })}
    </motion.ul>
  )
}

export { UploadStack, type UploadStackProps }
