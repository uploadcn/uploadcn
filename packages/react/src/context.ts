import type { UploadItem, Uploader, ValidationOptions } from "@uploadcn/core"
import * as React from "react"

import type { UploadMessages } from "./messages"
import { useUploadSelector } from "./use-upload-selector"

export interface UploadContextValue {
  uploader: Uploader<unknown>
  /** Opens the native file picker. */
  openFileDialog: () => void
  /** Adds files through the same path as the picker and drops. */
  addFiles: (files: File[]) => void
  accept: ValidationOptions["accept"]
  multiple: boolean
  disabled: boolean
  messages: UploadMessages
  inputId: string
}

export const UploadContext = React.createContext<UploadContextValue | null>(
  null
)

export function useUploadContext(): UploadContextValue {
  const context = React.useContext(UploadContext)
  if (!context) {
    throw new Error(
      "Upload components must be rendered inside <Upload> (Upload.Root)"
    )
  }
  return context
}

export const UploadItemContext = React.createContext<UploadItem | null>(null)

/**
 * The current item. Inside `<UploadItem>` it reads from context; pass an id
 * to subscribe to any item from within `<Upload>`.
 */
export function useUploadItem<TResult = unknown>(
  id?: string
): UploadItem<TResult> {
  const fromContext = React.useContext(UploadItemContext)
  const upload = React.useContext(UploadContext)
  const byId = useOptionalItem(upload?.uploader ?? null, id)
  const item = id ? byId : fromContext
  if (!item) {
    throw new Error(
      id
        ? `No upload item with id "${id}"`
        : "useUploadItem() must be used inside <UploadItem> or given an id"
    )
  }
  return item as UploadItem<TResult>
}

const emptyState = { items: [], online: true } as const
const noop = () => () => {}
const nullUploader = {
  getState: () => emptyState,
  subscribe: noop,
  getItem: () => undefined,
} as unknown as Uploader<unknown>

function useOptionalItem(
  uploader: Uploader<unknown> | null,
  id: string | undefined
) {
  const source = uploader ?? nullUploader
  return useUploadSelector(source, () => (id ? source.getItem(id) : undefined))
}
