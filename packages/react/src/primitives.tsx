import {
  type UploadItem,
  type Uploader,
  formatBytes,
  formatDuration,
  formatSpeed,
  getUploadSummary,
  isActiveStatus,
  toAcceptAttribute,
} from "@uploadcn/core"
import * as React from "react"

import { useUploadConfig } from "./config"

import {
  UploadContext,
  type UploadContextValue,
  UploadItemContext,
  useUploadContext,
  useUploadItem,
} from "./context"
import {
  type UploadMessages,
  defaultMessages,
  getStatusLabel,
} from "./messages"
import {
  type RenderProp,
  dataAttributes,
  mergeProps,
  renderElement,
} from "./render"
import { useDropzone } from "./use-dropzone"
import { getPreviewKind, useFilePreview } from "./use-file-preview"
import { shallowArrayEqual, useUploadSelector } from "./use-upload-selector"
import { type UseUploaderOptions, useUploader } from "./use-uploader"

type ElementProps<
  TTag extends keyof React.JSX.IntrinsicElements,
  TState,
> = Omit<React.ComponentPropsWithRef<TTag>, "children"> & {
  render?: RenderProp<TState>
  children?: React.ReactNode
}

const visuallyHidden: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
}

// ── Root ────────────────────────────────────────────────────────────────────

const OPTION_KEYS = [
  "adapter",
  "autoUpload",
  "concurrency",
  "retry",
  "duplicates",
  "transform",
  "process",
  "persistence",
  "network",
  "progressInterval",
  "accept",
  "maxSize",
  "minSize",
  "maxFiles",
  "minFiles",
  "image",
  "media",
  "validate",
  "restore",
  "onAdd",
  "onReject",
  "onSuccess",
  "onError",
  "onComplete",
] as const satisfies readonly (keyof UseUploaderOptions<unknown>)[]

export interface UploadRootState {
  disabled: boolean
  isUploading: boolean
}

interface UploadRootOwnProps<TResult> {
  /** Allow selecting several files. Default `true` (unless `maxFiles` is 1). */
  multiple?: boolean
  disabled?: boolean
  /**
   * Renders hidden inputs with the values of successful uploads, so the
   * component works in plain `<form>`s and server actions.
   */
  name?: string
  /** Value submitted per successful upload. Defaults to `result.key`, `result.url`, or the file name. */
  getFormValue?: (item: UploadItem<TResult>) => string
  /**
   * What the form submits under `name`: `"value"` (default) submits a value
   * per successful upload; `"file"` submits the selected files themselves,
   * so the component works as a plain file input (no upload needed).
   */
  submit?: "value" | "file"
  /** Opens the camera on mobile (`<input capture>`). */
  capture?: "user" | "environment"
  /** Let users pick whole folders. */
  directory?: boolean
  /** Translate or customize every string. */
  messages?: Partial<UploadMessages>
  render?: RenderProp<UploadRootState>
  children?: React.ReactNode
}

type DivProps = Omit<React.ComponentPropsWithRef<"div">, "onError" | "children">

export type UploadRootProps<TResult = unknown> = DivProps &
  UploadRootOwnProps<TResult> &
  (
    | ({ uploader: Uploader<TResult> } & {
        [K in (typeof OPTION_KEYS)[number]]?: never
      })
    | ({ uploader?: undefined } & UseUploaderOptions<TResult>)
  )

const SUBMITTED = new Set(["idle", "queued", "uploading", "paused", "success"])

/** A hidden file input that mirrors the queue, for native form submission. */
function FormFiles({
  name,
  items,
}: {
  name: string
  items: readonly UploadItem[]
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    const input = ref.current
    if (!input || typeof DataTransfer === "undefined") return
    const transfer = new DataTransfer()
    for (const item of items) {
      if (SUBMITTED.has(item.status)) transfer.items.add(item.file)
    }
    input.files = transfer.files
  }, [items])
  return (
    <input
      ref={ref}
      type="file"
      name={name}
      multiple
      hidden
      tabIndex={-1}
      aria-hidden
    />
  )
}

function defaultFormValue(item: UploadItem): string {
  const result = item.result as
    { key?: unknown; url?: unknown } | null | undefined
  if (result && typeof result.key === "string") return result.key
  if (result && typeof result.url === "string") return result.url
  return item.name
}

/**
 * The root of an upload UI. Pass uploader options directly
 * (`<Upload adapter={…} maxFiles={5}>`) or an `uploader` from `useUploader`
 * to control it from outside.
 */
export function UploadRoot<TResult = unknown>(props: UploadRootProps<TResult>) {
  if (props.uploader) {
    return <UploadRootView {...(props as UploadRootViewProps<TResult>)} />
  }
  return <UploadRootWithUploader {...props} />
}

function UploadRootWithUploader<TResult>(props: UploadRootProps<TResult>) {
  const options: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if ((OPTION_KEYS as readonly string[]).includes(key)) options[key] = value
    else rest[key] = value
  }
  const uploader = useUploader(
    options as unknown as UseUploaderOptions<TResult>
  )
  return (
    <UploadRootView
      {...(rest as Omit<UploadRootViewProps<TResult>, "uploader">)}
      uploader={uploader}
    />
  )
}

type UploadRootViewProps<TResult> = DivProps &
  UploadRootOwnProps<TResult> & { uploader: Uploader<TResult> }

function UploadRootView<TResult>({
  uploader: typedUploader,
  multiple: multipleProp,
  disabled = false,
  name,
  getFormValue = defaultFormValue as (item: UploadItem<TResult>) => string,
  submit = "value",
  capture,
  directory,
  messages: messagesProp,
  render,
  children,
  ...props
}: UploadRootViewProps<TResult>) {
  const uploader = typedUploader as unknown as Uploader<unknown>
  const inputRef = React.useRef<HTMLInputElement>(null)
  const inputId = React.useId()
  const { accept, maxFiles } = uploader.getOptions()
  const multiple = multipleProp ?? maxFiles !== 1

  const configMessages = useUploadConfig().messages
  const messages = React.useMemo(
    () => ({
      ...defaultMessages,
      ...configMessages,
      ...messagesProp,
      status: {
        ...defaultMessages.status,
        ...configMessages?.status,
        ...messagesProp?.status,
      },
    }),
    [configMessages, messagesProp]
  )

  const items = useUploadSelector(uploader, (state) => state.items)
  const isUploading = React.useMemo(
    () => getUploadSummary(items).isUploading,
    [items]
  )

  const addFiles = React.useCallback(
    (files: File[]) => {
      if (disabled || files.length === 0) return
      if (!multiple) {
        // Single-file mode replaces the current file (avatars, documents).
        uploader.remove()
        void uploader.add(files.slice(0, 1))
        return
      }
      void uploader.add(files)
    },
    [disabled, multiple, uploader]
  )

  const openFileDialog = React.useCallback(() => {
    if (!disabled) inputRef.current?.click()
  }, [disabled])

  const context = React.useMemo<UploadContextValue>(
    () => ({
      uploader,
      openFileDialog,
      addFiles,
      accept,
      multiple,
      disabled,
      messages,
      inputId,
    }),
    [
      uploader,
      openFileDialog,
      addFiles,
      accept,
      multiple,
      disabled,
      messages,
      inputId,
    ]
  )

  const state: UploadRootState = { disabled, isUploading }
  const rootProps = mergeProps(
    {
      ...dataAttributes({ disabled, uploading: isUploading }),
      "aria-busy": isUploading || undefined,
    },
    props
  )

  const directoryProps = directory ? { webkitdirectory: "", directory: "" } : {}

  return (
    <UploadContext.Provider value={context}>
      {renderElement(
        "div",
        {
          ...rootProps,
          children: (
            <>
              {children}
              <input
                ref={inputRef}
                id={inputId}
                type="file"
                tabIndex={-1}
                aria-hidden
                style={visuallyHidden}
                accept={toAcceptAttribute(accept)}
                multiple={multiple}
                disabled={disabled}
                capture={capture}
                {...directoryProps}
                onChange={(event) => {
                  addFiles(Array.from(event.currentTarget.files ?? []))
                  // Reset so selecting the same file again fires `change`.
                  event.currentTarget.value = ""
                }}
              />
              {name && submit === "file" ? (
                <FormFiles name={name} items={items} />
              ) : null}
              {name && submit === "value"
                ? items
                    .filter((item) => item.status === "success")
                    .map((item) => (
                      <input
                        key={item.id}
                        type="hidden"
                        name={name}
                        value={getFormValue(item as UploadItem<TResult>)}
                      />
                    ))
                : null}
              <UploadAnnouncer uploader={uploader} messages={messages} />
            </>
          ),
        },
        render,
        state
      )}
    </UploadContext.Provider>
  )
}

function UploadAnnouncer({
  uploader,
  messages,
}: {
  uploader: Uploader<unknown>
  messages: UploadMessages
}) {
  const [message, setMessage] = React.useState("")
  const messagesRef = React.useRef(messages)
  React.useEffect(() => {
    messagesRef.current = messages
  })

  React.useEffect(() => {
    const m = () => messagesRef.current
    const unsubscribers = [
      uploader.on("add", ({ items }) => setMessage(m().added(items.length))),
      uploader.on("success", ({ item }) => setMessage(m().uploaded(item.name))),
      uploader.on("error", ({ item, error }) =>
        setMessage(m().failed(item.name, error.message))
      ),
      uploader.on("reject", ({ item }) =>
        setMessage(m().rejected(item.name, item.issues[0]?.message ?? ""))
      ),
      uploader.on("cancel", ({ item }) => setMessage(m().cancelled(item.name))),
    ]
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe()
    }
  }, [uploader])

  return (
    <div role="status" aria-live="polite" aria-atomic style={visuallyHidden}>
      {message}
    </div>
  )
}

// ── Dropzone & trigger ──────────────────────────────────────────────────────

export interface UploadDropzoneState {
  isDragging: boolean
  isDragReject: boolean
  disabled: boolean
}

export type UploadDropzoneProps = ElementProps<"div", UploadDropzoneState> & {
  /**
   * Clicking or pressing Enter/Space opens the file picker. Set `false` when
   * the dropzone contains its own `UploadTrigger`. Default `true`.
   */
  clickable?: boolean
}

const INTERACTIVE =
  "button, a, input, select, textarea, [role=button], [role=link]"

export function UploadDropzone({
  render,
  clickable = true,
  ...props
}: UploadDropzoneProps) {
  const { addFiles, accept, multiple, disabled, openFileDialog } =
    useUploadContext()
  const { isDragging, isDragReject, handlers } = useDropzone({
    onDrop: addFiles,
    accept,
    multiple,
    disabled,
  })
  const state = { isDragging, isDragReject, disabled }

  const interaction: Record<string, unknown> = clickable
    ? {
        role: "button",
        tabIndex: disabled ? -1 : 0,
        "aria-disabled": disabled || undefined,
        onClick(event: React.MouseEvent<HTMLElement>) {
          // Ignore clicks on nested controls (they handle themselves).
          const target = (event.target as HTMLElement).closest(INTERACTIVE)
          if (target && target !== event.currentTarget) return
          openFileDialog()
        },
        onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
          if (event.target !== event.currentTarget) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openFileDialog()
          }
        },
      }
    : {}

  return renderElement(
    "div",
    mergeProps(
      {
        ...handlers,
        ...interaction,
        ...dataAttributes({
          dragging: isDragging,
          "drag-reject": isDragReject,
          disabled,
        }),
      },
      props
    ),
    render,
    state
  )
}

export type UploadTriggerProps = ElementProps<"button", { disabled: boolean }>

/** A button that opens the file picker. */
export function UploadTrigger({ render, ...props }: UploadTriggerProps) {
  const { openFileDialog, disabled, inputId } = useUploadContext()
  return renderElement(
    "button",
    mergeProps(
      {
        type: "button",
        disabled,
        "aria-controls": inputId,
        onClick: openFileDialog,
      },
      props
    ),
    render,
    { disabled }
  )
}

// ── List & items ────────────────────────────────────────────────────────────

export type UploadListProps = Omit<
  ElementProps<"ul", { count: number }>,
  "children"
> & {
  /**
   * A template rendered once per item (`<UploadItem>…</UploadItem>`), or a
   * function of the item for full control.
   */
  children?: React.ReactNode | ((item: UploadItem) => React.ReactNode)
  /** Show only matching items (e.g. hide rejected ones). */
  filter?: (item: UploadItem) => boolean
}

const ItemSlot = React.memo(function ItemSlot({
  id,
  template,
}: {
  id: string
  template: React.ReactNode | ((item: UploadItem) => React.ReactNode)
}) {
  const item = useUploadItem(id)
  return (
    <UploadItemContext.Provider value={item}>
      {typeof template === "function" ? template(item) : template}
    </UploadItemContext.Provider>
  )
})

/**
 * A list of uploads. Children are rendered once per item, with the item in
 * context; each item re-renders on its own progress without re-rendering
 * its siblings.
 */
export function UploadList({
  render,
  children,
  filter,
  ...props
}: UploadListProps) {
  const { uploader } = useUploadContext()
  const ids = useUploadSelector(
    uploader,
    (state) =>
      (filter ? state.items.filter(filter) : state.items).map(
        (item) => item.id
      ),
    shallowArrayEqual
  )
  const content = ids.map((id) => (
    <ItemSlot key={id} id={id} template={children} />
  ))
  return renderElement(
    "ul",
    mergeProps(
      { role: "list", ...dataAttributes({ empty: ids.length === 0 }) },
      {
        ...props,
        children: content,
      }
    ),
    render,
    { count: ids.length }
  )
}

export type UploadItemProps = ElementProps<"li", UploadItem> & {
  /** The item to render. Optional inside `UploadList`, which provides it. */
  item?: UploadItem
}

/** Provides an item to the item-level primitives inside it. */
export function UploadItemRoot({
  item: itemProp,
  render,
  ...props
}: UploadItemProps) {
  const contextItem = React.useContext(UploadItemContext)
  const item = itemProp ?? contextItem
  if (!item) {
    throw new Error(
      "UploadItem needs an `item` prop or must be rendered inside UploadList"
    )
  }
  return (
    <UploadItemContext.Provider value={item}>
      {renderElement(
        "li",
        mergeProps(
          {
            ...dataAttributes({ status: item.status, restored: item.restored }),
            "aria-busy": isActiveStatus(item.status) || undefined,
          },
          props
        ),
        render,
        item
      )}
    </UploadItemContext.Provider>
  )
}

export type UploadPreviewProps = Omit<
  ElementProps<"img", UploadItem>,
  "src"
> & {
  /** Shown for files that can't be previewed as images. */
  fallback?: React.ReactNode
  /** Max thumbnail dimension in px. Default 256. */
  thumbnailSize?: number
}

/** An image thumbnail of the item, or `fallback` for other file types. */
export function UploadPreview({
  render,
  fallback = null,
  thumbnailSize = 256,
  alt = "",
  ...props
}: UploadPreviewProps) {
  const item = useUploadItem()
  const isImage = getPreviewKind(item.file) === "image"
  const url = useFilePreview(isImage ? item.originalFile : null, {
    thumbnailSize,
  })
  if (!isImage) return <>{fallback}</>
  if (!url) return null
  return renderElement(
    "img",
    mergeProps({ src: url, alt, decoding: "async", draggable: false }, props),
    render,
    item
  )
}

export function UploadName({
  render,
  ...props
}: ElementProps<"span", UploadItem>) {
  const item = useUploadItem()
  return renderElement(
    "span",
    mergeProps({ title: item.name, children: item.name }, props),
    render,
    item
  )
}

export type UploadSizeProps = ElementProps<"span", UploadItem> & {
  /** `"total"` shows the size; `"progress"` shows "3 MB / 10 MB" while uploading. */
  format?: "total" | "progress"
}

export function UploadSize({
  render,
  format = "progress",
  ...props
}: UploadSizeProps) {
  const item = useUploadItem()
  const showProgress =
    format === "progress" &&
    (item.status === "uploading" || item.status === "paused")
  const text = showProgress
    ? `${formatBytes(item.progress.loaded)} / ${formatBytes(item.size)}`
    : formatBytes(item.size)
  return renderElement(
    "span",
    mergeProps({ children: text }, props),
    render,
    item
  )
}

/** Upload speed and time remaining, while uploading. */
export function UploadSpeed({
  render,
  ...props
}: ElementProps<"span", UploadItem>) {
  const item = useUploadItem()
  if (item.status !== "uploading" || item.progress.speed == null) return null
  const eta = formatDuration(item.progress.eta)
  const text = `${formatSpeed(item.progress.speed)}${eta ? ` · ${eta} left` : ""}`
  return renderElement(
    "span",
    mergeProps({ children: text }, props),
    render,
    item
  )
}

export function UploadStatus({
  render,
  ...props
}: ElementProps<"span", UploadItem>) {
  const item = useUploadItem()
  const { messages } = useUploadContext()
  return renderElement(
    "span",
    mergeProps(
      {
        ...dataAttributes({ status: item.status }),
        children: getStatusLabel(item, messages),
      },
      props
    ),
    render,
    item
  )
}

/** The item's error or validation message, when it has one. */
export function UploadError({
  render,
  ...props
}: ElementProps<"p", UploadItem>) {
  const item = useUploadItem()
  if (!item.error) return null
  if (item.status !== "error" && item.status !== "rejected") return null
  const message = item.issues.length
    ? item.issues.map((issue) => issue.message).join(". ")
    : item.error.message
  return renderElement(
    "p",
    mergeProps(
      { ...dataAttributes({ status: item.status }), children: message },
      props
    ),
    render,
    item
  )
}

/** Renders its children only once the item uploaded successfully. */
export function UploadSuccess({ children }: { children?: React.ReactNode }) {
  const item = useUploadItem()
  return item.status === "success" ? <>{children}</> : null
}

// ── Progress ────────────────────────────────────────────────────────────────

export interface UploadProgressState {
  percent: number
  indeterminate: boolean
  complete: boolean
}

const ProgressContext = React.createContext<UploadProgressState | null>(null)

export type UploadProgressProps = ElementProps<"div", UploadProgressState>

/**
 * An accessible progress bar. Inside `<UploadItem>` it tracks that item;
 * anywhere else it tracks the whole queue.
 */
export function UploadProgress(props: UploadProgressProps) {
  const item = React.useContext(UploadItemContext)
  return item ? (
    <ItemProgress item={item} {...props} />
  ) : (
    <QueueProgress {...props} />
  )
}

function ItemProgress({
  item,
  ...props
}: UploadProgressProps & { item: UploadItem }) {
  const { messages } = useUploadContext()
  const done =
    item.status === "success" ||
    item.status === "processing" ||
    item.status === "scanning"
  const indeterminate =
    item.status === "validating" ||
    item.status === "processing" ||
    item.status === "scanning" ||
    (item.status === "uploading" && item.size === 0)
  return (
    <ProgressView
      {...props}
      percent={done ? 100 : item.progress.percent}
      indeterminate={indeterminate}
      complete={item.status === "success"}
      label={messages.progress(item.name)}
      status={item.status}
    />
  )
}

function QueueProgress(props: UploadProgressProps) {
  const { uploader, messages } = useUploadContext()
  const items = useUploadSelector(uploader, (state) => state.items)
  const summary = React.useMemo(() => getUploadSummary(items), [items])
  return (
    <ProgressView
      {...props}
      percent={summary.percent}
      indeterminate={false}
      complete={summary.isComplete}
      label={messages.totalProgress}
    />
  )
}

function ProgressView({
  render,
  percent,
  indeterminate,
  complete,
  label,
  status,
  ...props
}: UploadProgressProps &
  UploadProgressState & { label: string; status?: string }) {
  const state = { percent, indeterminate, complete }
  return (
    <ProgressContext.Provider value={state}>
      {renderElement(
        "div",
        mergeProps(
          {
            role: "progressbar",
            "aria-label": label,
            "aria-valuemin": 0,
            "aria-valuemax": 100,
            "aria-valuenow": indeterminate ? undefined : Math.round(percent),
            "aria-valuetext": indeterminate
              ? undefined
              : `${Math.round(percent)}%`,
            style: {
              "--upload-progress": `${percent}%`,
            } as React.CSSProperties,
            ...dataAttributes({ indeterminate, complete, status }),
          },
          props
        ),
        render,
        state
      )}
    </ProgressContext.Provider>
  )
}

/** The filled part of `UploadProgress`. */
export function UploadProgressIndicator({
  render,
  ...props
}: ElementProps<"div", UploadProgressState>) {
  const state = React.useContext(ProgressContext)
  if (!state)
    throw new Error("UploadProgressIndicator must be inside UploadProgress")
  return renderElement(
    "div",
    mergeProps(
      {
        style: state.indeterminate
          ? undefined
          : { transform: `translateX(-${100 - state.percent}%)` },
        ...dataAttributes({
          indeterminate: state.indeterminate,
          complete: state.complete,
        }),
      },
      props
    ),
    render,
    state
  )
}

// ── Item actions ────────────────────────────────────────────────────────────

type ActionProps = ElementProps<"button", UploadItem> & {
  /** Render (disabled) even when the action doesn't apply. */
  forceMount?: boolean
}

function createItemAction(
  name: string,
  isAvailable: (item: UploadItem, uploader: Uploader<unknown>) => boolean,
  perform: (item: UploadItem, uploader: Uploader<unknown>) => void,
  label: (messages: UploadMessages, name: string) => string
) {
  function Action({ render, forceMount = false, ...props }: ActionProps) {
    const item = useUploadItem()
    const { uploader, messages } = useUploadContext()
    const available = isAvailable(item, uploader)
    if (!available && !forceMount) return null
    return renderElement(
      "button",
      mergeProps(
        {
          type: "button",
          disabled: !available,
          "aria-label": label(messages, item.name),
          onClick: () => perform(item, uploader),
        },
        props
      ),
      render,
      item
    )
  }
  Action.displayName = name
  return Action
}

export const UploadRemove = createItemAction(
  "UploadRemove",
  () => true,
  (item, uploader) => uploader.remove(item.id),
  (m, name) => m.remove(name)
)

export const UploadCancel = createItemAction(
  "UploadCancel",
  (item) => isActiveStatus(item.status) || item.status === "paused",
  (item, uploader) => uploader.cancel(item.id),
  (m, name) => m.cancel(name)
)

export const UploadRetry = createItemAction(
  "UploadRetry",
  (item) => item.status === "error" || item.status === "cancelled",
  (item, uploader) => uploader.retry(item.id),
  (m, name) => m.retry(name)
)

export const UploadPause = createItemAction(
  "UploadPause",
  (item, uploader) => uploader.canPause(item),
  (item, uploader) => uploader.pause(item.id),
  (m, name) => m.pause(name)
)

export const UploadResume = createItemAction(
  "UploadResume",
  (item) => item.status === "paused",
  (item, uploader) => uploader.resume(item.id),
  (m, name) => m.resume(name)
)

// ── Queue-level ─────────────────────────────────────────────────────────────

/** Renders its children only while the queue is empty. */
export function UploadEmpty({ children }: { children?: React.ReactNode }) {
  const { uploader } = useUploadContext()
  const empty = useUploadSelector(uploader, (state) => state.items.length === 0)
  return empty ? <>{children}</> : null
}

type QueueActionProps = ElementProps<"button", { count: number }> & {
  forceMount?: boolean
}

/** Starts idle uploads (when `autoUpload` is off). Hidden when there are none. */
export function UploadStart({
  render,
  forceMount = false,
  ...props
}: QueueActionProps) {
  const { uploader, disabled } = useUploadContext()
  const count = useUploadSelector(
    uploader,
    (state) => state.items.filter((item) => item.status === "idle").length
  )
  if (count === 0 && !forceMount) return null
  return renderElement(
    "button",
    mergeProps(
      {
        type: "button",
        disabled: disabled || count === 0,
        onClick: () => uploader.start(),
      },
      props
    ),
    render,
    { count }
  )
}

/** Removes finished items (or every item with `all`). Hidden when there's nothing to clear. */
export function UploadClear({
  render,
  forceMount = false,
  all = false,
  ...props
}: QueueActionProps & { all?: boolean }) {
  const { uploader } = useUploadContext()
  const count = useUploadSelector(uploader, (state) =>
    all
      ? state.items.length
      : state.items.filter((item) =>
          ["success", "cancelled", "rejected"].includes(item.status)
        ).length
  )
  if (count === 0 && !forceMount) return null
  return renderElement(
    "button",
    mergeProps(
      {
        type: "button",
        disabled: count === 0,
        onClick: () => (all ? uploader.remove() : uploader.clearCompleted()),
      },
      props
    ),
    render,
    { count }
  )
}
