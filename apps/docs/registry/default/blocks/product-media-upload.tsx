"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import {
  UploadItemContext,
  useUploadContext,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  NativeButton,
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadItemMedia,
  UploadItemProgress,
  UploadSummary,
} from "@/registry/default/ui/upload"

interface ProductMediaUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Default 8, what most storefronts allow per product. */
  maxFiles?: number
  /** Default 20 MB. */
  maxSize?: number
  /** Called with the images in display order; the first is the cover. */
  onChange?: (images: UploadItemData<TResult>[]) => void
  className?: string
}

/**
 * Product photos for a storefront: the first image is the cover. Reorder
 * by dragging or with the arrow buttons, and promote any image to cover.
 */
function ProductMediaUpload<TResult = unknown>({
  adapter,
  uploader,
  maxFiles = 8,
  maxSize = 20 * 1000 * 1000,
  onChange,
  className,
}: ProductMediaUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: "image/*",
            maxFiles,
            maxSize,
          }) as UploadRootProps<TResult>)}
      className={className}
    >
      <MediaGrid
        maxFiles={maxFiles}
        onChange={onChange as (images: UploadItemData[]) => void}
      />
    </Upload>
  )
}

function useOrderedItems() {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) =>
    state.items.filter(
      (item) => item.status !== "rejected" && item.status !== "cancelled"
    )
  )
  const [order, setOrder] = React.useState<string[]>([])
  const rank = (id: string) => {
    const index = order.indexOf(id)
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
  const ordered = [...items].sort(
    (a, b) => rank(a.id) - rank(b.id) || a.createdAt - b.createdAt
  )
  const move = (id: string, to: number) => {
    const ids = ordered.map((item) => item.id).filter((entry) => entry !== id)
    ids.splice(Math.max(0, Math.min(to, ids.length)), 0, id)
    setOrder(ids)
  }
  return { ordered, move }
}

function MediaGrid({
  maxFiles,
  onChange,
}: {
  maxFiles: number
  onChange?: (images: UploadItemData[]) => void
}) {
  const { uploader } = useUploadContext()
  const { ordered, move } = useOrderedItems()
  const [dragging, setDragging] = React.useState<string | null>(null)
  const rejected = useUploadSelector(uploader, (state) =>
    state.items.find((item) => item.status === "rejected")
  )

  const key = ordered.map((item) => `${item.id}:${item.status}`).join()
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  })
  React.useEffect(() => {
    onChangeRef.current?.(ordered)
    // `key` captures order and status changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="cn-upload-card-title">Product media</h3>
          <p className="text-xs text-muted-foreground">
            The first image is the cover. Drag to reorder.
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {ordered.length}/{maxFiles}
        </span>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {ordered.map((item, index) => (
          <UploadItemContext.Provider key={item.id} value={item}>
            <li
              draggable
              onDragStart={(event) => {
                setDragging(item.id)
                event.dataTransfer.effectAllowed = "move"
                event.dataTransfer.setData("text/x-uploadcn-id", item.id)
              }}
              onDragEnd={() => setDragging(null)}
              onDragOver={(event) => {
                if (dragging) event.preventDefault()
              }}
              onDrop={(event) => {
                if (!dragging) return
                event.preventDefault()
                event.stopPropagation()
                move(dragging, index)
                setDragging(null)
              }}
              data-dragging={dragging === item.id || undefined}
              className={cn(
                "group/media relative aspect-square cursor-grab overflow-hidden rounded-lg border bg-muted transition-[opacity,box-shadow] active:cursor-grabbing data-dragging:opacity-40",
                index === 0 && "col-span-2 row-span-2"
              )}
            >
              <UploadItemMedia variant="cover" />
              {index === 0 ? (
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-0.5 text-xs font-medium shadow-sm backdrop-blur-sm">
                  <IconPlaceholder
                    lucide="StarIcon"
                    tabler="IconStar"
                    hugeicons="StarIcon"
                    phosphor="StarIcon"
                    remixicon="RiStarLine"
                    className="size-3 fill-current"
                    aria-hidden
                  />
                  Cover
                </span>
              ) : null}
              <UploadItemProgress className="absolute inset-x-2 bottom-2 w-auto bg-background/60" />
              <div className="absolute top-1.5 right-1.5 flex gap-0.5 rounded-md bg-background/90 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-focus-within/media:opacity-100 group-hover/media:opacity-100">
                {index > 0 ? (
                  <>
                    <NativeButton
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Make ${item.name} the cover`}
                      onClick={() => move(item.id, 0)}
                    >
                      <IconPlaceholder
                        lucide="StarIcon"
                        tabler="IconStar"
                        hugeicons="StarIcon"
                        phosphor="StarIcon"
                        remixicon="RiStarLine"
                      />
                    </NativeButton>
                    <NativeButton
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Move ${item.name} earlier`}
                      onClick={() => move(item.id, index - 1)}
                    >
                      <IconPlaceholder
                        lucide="ChevronLeftIcon"
                        tabler="IconChevronLeft"
                        hugeicons="ArrowLeft01Icon"
                        phosphor="CaretLeftIcon"
                        remixicon="RiArrowLeftSLine"
                      />
                    </NativeButton>
                  </>
                ) : null}
                {index < ordered.length - 1 ? (
                  <NativeButton
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Move ${item.name} later`}
                    onClick={() => move(item.id, index + 1)}
                  >
                    <IconPlaceholder
                      lucide="ChevronRightIcon"
                      tabler="IconChevronRight"
                      hugeicons="ArrowRight01Icon"
                      phosphor="CaretRightIcon"
                      remixicon="RiArrowRightSLine"
                    />
                  </NativeButton>
                ) : null}
                <NativeButton
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => uploader.remove(item.id)}
                >
                  <IconPlaceholder
                    lucide="XIcon"
                    tabler="IconX"
                    hugeicons="Cancel01Icon"
                    phosphor="XIcon"
                    remixicon="RiCloseLine"
                  />
                </NativeButton>
              </div>
            </li>
          </UploadItemContext.Provider>
        ))}
        {ordered.length < maxFiles ? (
          <li
            className={cn(
              "aspect-square",
              ordered.length === 0 && "col-span-3 aspect-auto sm:col-span-4"
            )}
          >
            <UploadDropzone
              size="sm"
              className={cn("h-full", ordered.length === 0 && "py-12")}
            >
              <IconPlaceholder
                lucide="ImagePlusIcon"
                tabler="IconPhotoPlus"
                hugeicons="ImageAdd01Icon"
                phosphor="ImageIcon"
                remixicon="RiImageAddLine"
                className="size-5 text-muted-foreground"
              />
              <UploadDropzoneTitle className="text-xs">
                {ordered.length === 0 ? "Add product photos" : "Add more"}
              </UploadDropzoneTitle>
              {ordered.length === 0 ? (
                <UploadDropzoneDescription className="text-xs">
                  Square images look best. Up to {maxFiles}.
                </UploadDropzoneDescription>
              ) : null}
            </UploadDropzone>
          </li>
        ) : null}
      </ul>
      <div className="flex min-h-4 justify-between gap-2">
        <UploadSummary />
        {rejected ? (
          <p className="text-xs text-destructive">
            {rejected.name}: {rejected.issues[0]?.message}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export { ProductMediaUpload, type ProductMediaUploadProps }
