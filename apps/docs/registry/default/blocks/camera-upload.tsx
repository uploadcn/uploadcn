"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import { useUploadContext, type UploadRootProps } from "@uploadcn/react"
import { cn } from "cn"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { useCamera } from "@/registry/default/hooks/use-camera"
import {
  NativeButton,
  Upload,
  UploadItem,
  UploadItemActions,
  UploadItemMedia,
  UploadItemProgress,
  UploadList,
  UploadTrigger,
} from "@/registry/default/ui/upload"

interface CameraUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Default 10. */
  maxFiles?: number
  facingMode?: "user" | "environment"
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * Take photos with the device camera and upload them as you go. The
 * camera starts only when the user asks, and falls back to the file
 * picker when access is denied or no camera exists.
 */
function CameraUpload<TResult = unknown>({
  adapter,
  uploader,
  maxFiles = 10,
  facingMode,
  onSuccess,
  className,
}: CameraUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: "image/*",
            maxFiles,
            onSuccess,
          }) as UploadRootProps<TResult>)}
      className={className}
    >
      <CameraCapture facingMode={facingMode} />
      <UploadList variant="grid" className="grid-cols-4 sm:grid-cols-5">
        <UploadItem variant="tile">
          <UploadItemMedia variant="cover" />
          <UploadItemActions />
          <UploadItemProgress className="absolute inset-x-1.5 bottom-1.5 w-auto" />
        </UploadItem>
      </UploadList>
    </Upload>
  )
}

const MESSAGES = {
  denied: "Camera access was blocked. Allow it in your browser settings.",
  unavailable: "No camera found on this device.",
  error: "The camera couldn't start.",
}

/** The viewfinder and controls. Use inside any `<Upload>`. */
function CameraCapture({
  facingMode,
  className,
}: {
  facingMode?: "user" | "environment"
  className?: string
}) {
  const { uploader } = useUploadContext()
  const {
    videoRef,
    status,
    facingMode: activeFacingMode,
    start,
    stop,
    flip,
    capture,
  } = useCamera({ facingMode })
  const [flash, setFlash] = React.useState(0)
  const live = status === "ready" || status === "starting"

  const shoot = async () => {
    const file = await capture()
    if (!file) return
    setFlash((value) => value + 1)
    void uploader.add([file])
  }

  return (
    <div
      data-slot="camera-capture"
      className={cn(
        "relative flex aspect-video flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border bg-muted text-center",
        className
      )}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label="Camera preview"
        className={cn(
          "absolute inset-0 size-full object-cover",
          activeFacingMode === "user" && "-scale-x-100",
          !live && "hidden"
        )}
      />
      {flash > 0 ? (
        <span
          key={flash}
          aria-hidden
          className="absolute inset-0 animate-out bg-white duration-500 fade-out-0 fill-mode-forwards motion-reduce:hidden"
        />
      ) : null}
      {live ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 bg-linear-to-t from-black/50 to-transparent p-4">
          <NativeButton
            variant="secondary"
            size="icon-sm"
            className="rounded-full"
            aria-label="Turn camera off"
            onClick={stop}
          >
            <IconPlaceholder
              lucide="CameraOffIcon"
              tabler="IconCameraOff"
              hugeicons="CameraOff01Icon"
              phosphor="CameraSlashIcon"
              remixicon="RiCameraOffLine"
            />
          </NativeButton>
          <button
            type="button"
            aria-label="Take photo"
            disabled={status !== "ready"}
            onClick={shoot}
            className="size-14 rounded-full border-4 border-white bg-white/30 transition-transform outline-none hover:bg-white/50 focus-visible:ring-3 focus-visible:ring-white/60 active:scale-90 disabled:opacity-50"
          />
          <NativeButton
            variant="secondary"
            size="icon-sm"
            className="rounded-full"
            aria-label="Switch camera"
            onClick={flip}
          >
            <IconPlaceholder
              lucide="SwitchCameraIcon"
              tabler="IconCameraRotate"
              hugeicons="CameraRotated01Icon"
              phosphor="CameraRotateIcon"
              remixicon="RiCameraSwitchLine"
            />
          </NativeButton>
        </div>
      ) : (
        <>
          <span className="flex size-11 items-center justify-center rounded-full border bg-background shadow-xs">
            <IconPlaceholder
              lucide="CameraIcon"
              tabler="IconCamera"
              hugeicons="Camera01Icon"
              phosphor="CameraIcon"
              remixicon="RiCameraLine"
              className="size-4"
            />
          </span>
          <p className="max-w-xs px-4 text-sm text-balance text-muted-foreground">
            {status === "idle"
              ? "Take photos and upload them right away."
              : MESSAGES[status as keyof typeof MESSAGES]}
          </p>
          <div className="flex gap-2">
            {status !== "unavailable" ? (
              <NativeButton size="sm" onClick={() => void start()}>
                {status === "idle" ? "Open camera" : "Try again"}
              </NativeButton>
            ) : null}
            <UploadTrigger variant="outline">Choose photos</UploadTrigger>
          </div>
        </>
      )}
    </div>
  )
}

export { CameraUpload, CameraCapture, type CameraUploadProps }
