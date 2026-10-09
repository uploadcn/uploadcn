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
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadItemActions,
  UploadItemMedia,
  UploadItemProgress,
  UploadTrigger,
} from "@/registry/default/ui/upload"

const DEFAULT_ROOMS = [
  "Exterior",
  "Living room",
  "Kitchen",
  "Bedroom",
  "Bathroom",
  "Other",
]

interface PropertyPhotosProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  rooms?: string[]
  /** Rooms every listing should show. Default all but "Other". */
  requiredRooms?: string[]
  /** Listings with at least this many photos perform better. Default 12. */
  recommended?: number
  maxFiles?: number
  /** Called with each photo and its room whenever tags change. */
  onChange?: (
    photos: { item: UploadItemData<TResult>; room: string | null }[]
  ) => void
  className?: string
}

/**
 * Listing photos for real estate and rentals: tag each photo with a room,
 * see which rooms are still missing, and aim for the recommended count.
 */
function PropertyPhotos<TResult = unknown>({
  adapter,
  uploader,
  rooms = DEFAULT_ROOMS,
  requiredRooms = rooms.filter((room) => room !== "Other"),
  recommended = 12,
  maxFiles = 40,
  onChange,
  className,
}: PropertyPhotosProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: "image/*",
            maxFiles,
            concurrency: 4,
          }) as UploadRootProps<TResult>)}
      className={className}
    >
      <Listing
        rooms={rooms}
        requiredRooms={requiredRooms}
        recommended={recommended}
        onChange={onChange as PropertyPhotosProps<unknown>["onChange"]}
      />
    </Upload>
  )
}

function Listing({
  rooms,
  requiredRooms,
  recommended,
  onChange,
}: {
  rooms: string[]
  requiredRooms: string[]
  recommended: number
  onChange?: PropertyPhotosProps<unknown>["onChange"]
}) {
  const { uploader } = useUploadContext()
  const photos = useUploadSelector(uploader, (state) =>
    state.items.filter(
      (item) => item.status !== "rejected" && item.status !== "cancelled"
    )
  )
  const roomOf = (item: UploadItemData) =>
    typeof item.meta.room === "string" ? item.meta.room : null
  const covered = new Set(photos.map(roomOf))
  const percent = Math.min(100, (photos.length / recommended) * 100)

  const key = photos
    .map((item) => `${item.id}:${roomOf(item)}:${item.status}`)
    .join()
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  })
  React.useEffect(() => {
    onChangeRef.current?.(photos.map((item) => ({ item, room: roomOf(item) })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <div className="flex flex-col gap-4">
      <div className="cn-upload-card flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="cn-upload-card-title">Listing photos</h3>
            <p className="text-xs text-muted-foreground tabular-nums">
              {photos.length} of {recommended} recommended
            </p>
          </div>
          <UploadTrigger size="sm">
            <IconPlaceholder
              lucide="HousePlusIcon"
              tabler="IconHomePlus"
              hugeicons="Home01Icon"
              phosphor="HouseLineIcon"
              remixicon="RiHome2Line"
              data-icon="inline-start"
            />
            Add photos
          </UploadTrigger>
        </div>
        <div
          role="progressbar"
          aria-label="Recommended photos"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-transform duration-500 motion-reduce:transition-none"
            style={{ transform: `translateX(-${100 - percent}%)` }}
          />
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="Rooms">
          {requiredRooms.map((room) => {
            const done = covered.has(room)
            return (
              <li
                key={room}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                  done
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                {done ? (
                  <IconPlaceholder
                    lucide="CheckIcon"
                    tabler="IconCheck"
                    hugeicons="Tick02Icon"
                    phosphor="CheckIcon"
                    remixicon="RiCheckLine"
                    className="size-3"
                  />
                ) : null}
                {room}
                <span className="sr-only">
                  {done ? " has photos" : " needs photos"}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
      {photos.length === 0 ? (
        <UploadDropzone className="py-14">
          <IconPlaceholder
            lucide="HousePlusIcon"
            tabler="IconHomePlus"
            hugeicons="Home01Icon"
            phosphor="HouseLineIcon"
            remixicon="RiHome2Line"
            className="size-6 text-muted-foreground"
          />
          <UploadDropzoneTitle>Drop photos of the property</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            Landscape photos in daylight work best
          </UploadDropzoneDescription>
        </UploadDropzone>
      ) : (
        <UploadDropzone
          clickable={false}
          variant="muted"
          size="sm"
          className="items-stretch bg-transparent p-0 hover:bg-transparent"
        >
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((item, index) => (
              <UploadItemContext.Provider key={item.id} value={item}>
                <li className="group/photo flex flex-col overflow-hidden rounded-lg border bg-card">
                  <div className="relative aspect-4/3 bg-muted">
                    <UploadItemMedia variant="cover" />
                    {index === 0 ? (
                      <span className="absolute top-2 left-2 rounded-md bg-background/90 px-1.5 py-0.5 text-xs font-medium shadow-sm">
                        Cover
                      </span>
                    ) : null}
                    <UploadItemActions className="absolute top-1.5 right-1.5 rounded-md bg-background/85 opacity-0 backdrop-blur-sm transition-opacity group-focus-within/photo:opacity-100 group-hover/photo:opacity-100" />
                    <UploadItemProgress className="absolute inset-x-2 bottom-2 w-auto bg-background/60" />
                  </div>
                  <label className="sr-only" htmlFor={`${item.id}-room`}>
                    Room for {item.name}
                  </label>
                  <select
                    id={`${item.id}-room`}
                    value={roomOf(item) ?? ""}
                    onChange={(event) =>
                      uploader.update(item.id, {
                        meta: { room: event.target.value || null },
                      })
                    }
                    className={cn(
                      "h-9 w-full cursor-pointer border-t bg-transparent px-2.5 text-sm outline-none focus-visible:bg-muted",
                      !roomOf(item) && "text-muted-foreground"
                    )}
                  >
                    <option value="">Tag a room…</option>
                    {rooms.map((room) => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                </li>
              </UploadItemContext.Provider>
            ))}
          </ul>
        </UploadDropzone>
      )}
    </div>
  )
}

export { PropertyPhotos, type PropertyPhotosProps }
