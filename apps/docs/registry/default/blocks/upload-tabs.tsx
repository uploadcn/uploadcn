"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import { useUploadContext, type UploadRootProps } from "@uploadcn/react"
import { cn } from "cn"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { Input } from "@/components/ui/input"
import { useCamera } from "@/registry/default/hooks/use-camera"
import {
  NativeButton,
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

type Source = "device" | "link" | "camera"

interface UploadTabsProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Which sources to offer. Default all three. */
  sources?: Source[]
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * One uploader, three sources: the device, a public link, or the camera.
 * Files from every tab land in the same queue.
 */
function UploadTabs<TResult = unknown>({
  adapter,
  uploader,
  sources = ["device", "link", "camera"],
  className,
  ...options
}: UploadTabsProps<TResult>) {
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
      <SourceTabs
        tabs={[
          {
            value: "device",
            label: "Device",
            icon: (
              <IconPlaceholder
                lucide="LaptopIcon"
                tabler="IconDeviceLaptop"
                hugeicons="LaptopIcon"
                phosphor="LaptopIcon"
                remixicon="RiMacbookLine"
              />
            ),
            content: (
              <UploadDropzone className="h-52">
                <UploadDropzoneHeader>
                  <UploadDropzoneMedia variant="icon">
                    <IconPlaceholder
                      lucide="UploadIcon"
                      tabler="IconUpload"
                      hugeicons="Upload01Icon"
                      phosphor="UploadSimpleIcon"
                      remixicon="RiUploadLine"
                    />
                  </UploadDropzoneMedia>
                  <UploadDropzoneTitle>
                    Drop files or click to browse
                  </UploadDropzoneTitle>
                  <UploadDropzoneDescription>
                    From your computer or phone
                  </UploadDropzoneDescription>
                </UploadDropzoneHeader>
              </UploadDropzone>
            ),
          },
          {
            value: "link",
            label: "Link",
            icon: (
              <IconPlaceholder
                lucide="LinkIcon"
                tabler="IconLink"
                hugeicons="LinkIcon"
                phosphor="LinkIcon"
                remixicon="RiLinksLine"
              />
            ),
            content: <LinkSource />,
          },
          {
            value: "camera",
            label: "Camera",
            icon: (
              <IconPlaceholder
                lucide="CameraIcon"
                tabler="IconCamera"
                hugeicons="Camera01Icon"
                phosphor="CameraIcon"
                remixicon="RiCameraLine"
              />
            ),
            content: <CameraSource />,
          },
        ].filter((tab) => sources.includes(tab.value as Source))}
      />
      <UploadQueue size="sm" />
    </Upload>
  )
}

/**
 * Accessible tabs (WAI-ARIA tabs pattern) without a primitive library, so
 * the block behaves the same on every shadcn base. Only the active panel is
 * mounted, leaving the Camera tab releases the camera.
 */
function SourceTabs({
  tabs,
}: {
  tabs: {
    value: string
    label: string
    icon: React.ReactNode
    content: React.ReactNode
  }[]
}) {
  const [active, setActive] = React.useState(tabs[0]?.value)
  const id = React.useId()
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const current = tabs.find((tab) => tab.value === active) ?? tabs[0]

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = tabs.length - 1
    const next =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null
    if (next == null) return
    event.preventDefault()
    setActive(tabs[next]!.value)
    refs.current[next]?.focus()
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Upload source"
        className="cn-upload-tabs-list flex w-full items-center gap-1 bg-muted text-muted-foreground"
      >
        {tabs.map((tab, index) => {
          const selected = tab.value === current?.value
          return (
            <button
              key={tab.value}
              ref={(element) => {
                refs.current[index] = element
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${tab.value}`}
              aria-selected={selected}
              aria-controls={`${id}-panel-${tab.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "cn-upload-tabs-trigger inline-flex h-full flex-1 items-center justify-center gap-1.5 px-2 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4",
                selected
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>
      {current ? (
        <div
          role="tabpanel"
          id={`${id}-panel-${current.value}`}
          aria-labelledby={`${id}-tab-${current.value}`}
        >
          {current.content}
        </div>
      ) : null}
    </div>
  )
}

function fileNameFromUrl(url: URL, type: string) {
  const last = decodeURIComponent(url.pathname.split("/").pop() ?? "")
  if (last.includes(".")) return last
  const extension = type.split("/")[1]?.split(";")[0] ?? "bin"
  return `${last || url.hostname}.${extension}`
}

/** Imports a file from a public URL. The server must allow CORS. */
function LinkSource() {
  const { uploader } = useUploadContext()
  const [url, setUrl] = React.useState("")
  const [state, setState] = React.useState<
    { status: "idle" | "loading" } | { status: "error"; message: string }
  >({ status: "idle" })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      setState({ status: "error", message: "Enter a full URL, like https://…" })
      return
    }
    // Only web links: no javascript:, data:, file: or blob: URLs.
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      setState({
        status: "error",
        message: "Only http and https links are supported",
      })
      return
    }
    setState({ status: "loading" })
    try {
      const response = await fetch(parsed)
      if (!response.ok)
        throw new Error(`The server answered ${response.status}`)
      const blob = await response.blob()
      const file = new File([blob], fileNameFromUrl(parsed, blob.type), {
        type: blob.type,
      })
      await uploader.add([file])
      setUrl("")
      setState({ status: "idle" })
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof TypeError
            ? "Couldn't fetch that link. The site may block downloads from other origins."
            : error instanceof Error
              ? error.message
              : "Couldn't import that link",
      })
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex h-52 flex-col justify-center gap-3 rounded-xl border border-dashed px-6"
    >
      <label htmlFor="upload-link" className="text-sm font-medium">
        Import from a link
      </label>
      <div className="flex gap-2">
        <Input
          id="upload-link"
          type="url"
          inputMode="url"
          placeholder="https://example.com/photo.jpg"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          aria-invalid={state.status === "error" || undefined}
          aria-describedby="upload-link-hint"
        />
        <NativeButton
          type="submit"
          disabled={!url || state.status === "loading"}
        >
          {state.status === "loading" ? "Importing…" : "Import"}
        </NativeButton>
      </div>
      <p
        id="upload-link-hint"
        className={
          state.status === "error"
            ? "text-xs text-destructive"
            : "text-xs text-muted-foreground"
        }
      >
        {state.status === "error"
          ? state.message
          : "The file is downloaded in your browser, then uploaded like any other."}
      </p>
    </form>
  )
}

function CameraSource() {
  const { uploader } = useUploadContext()
  const { videoRef, status, start, stop, capture } = useCamera()
  const live = status === "ready" || status === "starting"

  return (
    <div className="relative flex h-52 flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border bg-muted text-center">
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label="Camera preview"
        className={live ? "absolute inset-0 size-full object-cover" : "hidden"}
      />
      {live ? (
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-linear-to-t from-black/50 to-transparent p-3">
          <NativeButton variant="secondary" size="sm" onClick={stop}>
            Close
          </NativeButton>
          <NativeButton
            size="sm"
            disabled={status !== "ready"}
            onClick={async () => {
              const file = await capture()
              if (file) void uploader.add([file])
            }}
          >
            <IconPlaceholder
              lucide="CameraIcon"
              tabler="IconCamera"
              hugeicons="Camera01Icon"
              phosphor="CameraIcon"
              remixicon="RiCameraLine"
              data-icon="inline-start"
            />
            Capture
          </NativeButton>
        </div>
      ) : (
        <>
          <p className="max-w-xs text-sm text-muted-foreground">
            {status === "denied"
              ? "Camera access was blocked. Allow it in your browser settings."
              : status === "unavailable"
                ? "No camera found on this device."
                : "Take a photo and upload it right away."}
          </p>
          {status !== "unavailable" ? (
            <NativeButton size="sm" onClick={() => void start()}>
              Open camera
            </NativeButton>
          ) : null}
        </>
      )}
    </div>
  )
}

export { UploadTabs, type UploadTabsProps }
