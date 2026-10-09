"use client"

import * as React from "react"
import { type UploadAdapter, type UploadItem } from "@uploadcn/core"
import {
  Upload as UploadPrimitive,
  useUploadContext,
  useUploadSelector,
} from "@uploadcn/react"
import { cn } from "cn"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { useCropQueue } from "@/registry/default/hooks/use-crop-queue"
import { ImageCropper } from "@/registry/default/ui/image-cropper"
import {
  NativeButton,
  Upload,
  UploadTrigger,
} from "@/registry/default/ui/upload"

interface AvatarUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Current avatar URL, shown until a new one is uploaded. */
  src?: string | null
  /** Output size in pixels (square). Default 512. */
  size?: number
  /** Called with the upload result, or `null` when the avatar is removed. */
  onChange?: (item: UploadItem<TResult> | null) => void
  name?: string
  className?: string
}

function AvatarUpload<TResult = unknown>({
  adapter,
  src,
  size = 512,
  onChange,
  name,
  className,
}: AvatarUploadProps<TResult>) {
  const crops = useCropQueue()
  const { request } = crops
  const transform = React.useCallback((file: File) => request(file), [request])

  return (
    <Upload
      adapter={adapter}
      accept="image/*"
      maxSize={10 * 1000 * 1000}
      multiple={false}
      transform={transform}
      onSuccess={onChange}
      name={name}
      className={cn("w-auto flex-row items-center gap-4", className)}
    >
      <AvatarPreview fallbackSrc={src ?? null} />
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <UploadTrigger>
            <IconPlaceholder
              lucide="CameraIcon"
              tabler="IconCamera"
              hugeicons="Camera01Icon"
              phosphor="CameraIcon"
              remixicon="RiCameraLine"
              data-icon="inline-start"
            />
            {src ? "Change photo" : "Upload photo"}
          </UploadTrigger>
          <AvatarRemove onRemove={() => onChange?.(null)} />
        </div>
        <AvatarHint />
      </div>
      <ImageCropper
        file={crops.current}
        cropShape="round"
        aspect={1}
        output={{
          maxWidth: size,
          maxHeight: size,
          type: "image/webp",
          quality: 0.9,
        }}
        onCrop={crops.complete}
        onCancel={crops.skip}
        title="Crop your photo"
      />
    </Upload>
  )
}

function useAvatarItem() {
  const { uploader } = useUploadContext()
  return useUploadSelector(uploader, (state) => state.items.at(-1) ?? null)
}

function AvatarPreview({ fallbackSrc }: { fallbackSrc: string | null }) {
  const item = useAvatarItem()
  const { openFileDialog } = useUploadContext()
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const uploading =
    item &&
    (item.status === "uploading" ||
      item.status === "queued" ||
      item.status === "validating")

  return (
    <button
      type="button"
      onClick={openFileDialog}
      aria-label="Change profile photo"
      className="group/avatar relative size-20 shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="absolute inset-1 flex items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
        {item && item.status !== "rejected" && item.status !== "cancelled" ? (
          <UploadPrimitive.Item
            item={item}
            render={<span className="contents" />}
          >
            <UploadPrimitive.Preview
              thumbnailSize={256}
              className="size-full animate-in object-cover duration-300 fade-in-0 motion-reduce:animate-none"
            />
          </UploadPrimitive.Item>
        ) : fallbackSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote avatar URL of unknown origin
          <img src={fallbackSrc} alt="" className="size-full object-cover" />
        ) : (
          <IconPlaceholder
            lucide="UserIcon"
            tabler="IconUser"
            hugeicons="UserIcon"
            phosphor="UserIcon"
            remixicon="RiUserLine"
            className="size-8"
            aria-hidden
          />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 transition-opacity group-hover/avatar:opacity-100 group-focus-visible/avatar:opacity-100">
          <IconPlaceholder
            lucide="CameraIcon"
            tabler="IconCamera"
            hugeicons="Camera01Icon"
            phosphor="CameraIcon"
            remixicon="RiCameraLine"
            className="size-5"
            aria-hidden
          />
        </span>
      </span>
      {item ? (
        <UploadPrimitive.Item
          item={item}
          render={<span className="contents" />}
        >
          <UploadPrimitive.Progress
            className={cn(
              "pointer-events-none absolute inset-0 transition-opacity",
              !uploading && "opacity-0"
            )}
            render={(props, state) => (
              <svg
                {...(props as React.ComponentProps<"svg">)}
                viewBox="0 0 100 100"
                aria-hidden={!uploading}
              >
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  strokeWidth="4"
                  className="stroke-muted"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - state.percent / 100)}
                  className="origin-center -rotate-90 stroke-primary transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none"
                />
              </svg>
            )}
          />
        </UploadPrimitive.Item>
      ) : null}
    </button>
  )
}

function AvatarRemove({ onRemove }: { onRemove: () => void }) {
  const item = useAvatarItem()
  const { uploader } = useUploadContext()
  if (!item) return null
  return (
    <NativeButton
      variant="ghost"
      size="sm"
      onClick={() => {
        uploader.remove()
        onRemove()
      }}
    >
      Remove
    </NativeButton>
  )
}

function AvatarHint() {
  const item = useAvatarItem()
  if (item?.status === "error" || item?.status === "rejected") {
    return (
      <p className="inline-flex items-center gap-1 text-xs text-destructive">
        <IconPlaceholder
          lucide="CircleAlertIcon"
          tabler="IconExclamationCircle"
          hugeicons="AlertCircleIcon"
          phosphor="WarningCircleIcon"
          remixicon="RiErrorWarningLine"
          className="size-3"
          aria-hidden
        />
        {item.issues[0]?.message ?? item.error?.message}
      </p>
    )
  }
  return (
    <p className="text-xs text-muted-foreground">
      JPG, PNG or WebP. Cropped to a square.
    </p>
  )
}

export { AvatarUpload, type AvatarUploadProps }
