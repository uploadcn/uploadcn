import type { UploadAdapter, UploaderOptions } from "@uploadcn/core"
import * as React from "react"

import type { UploadMessages } from "./messages"

/**
 * Paste to upload: `true` takes pasted files while the upload component is
 * focused or hovered, `"global"` takes them from anywhere on the page.
 */
export type UploadPasteMode = boolean | "global"

/**
 * App-wide defaults for every uploader below the provider: where files go
 * (`adapter`), limits, retries, messages and paste. Props on a component win.
 */
export interface UploadConfig extends Partial<
  Omit<UploaderOptions<unknown>, "adapter">
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- results are app-defined
  adapter?: UploadAdapter<any>
  messages?: Partial<UploadMessages>
  /**
   * Paste to upload (Ctrl/⌘+V) for every upload component below the
   * provider. Off by default; a component's own `paste` prop wins.
   */
  paste?: UploadPasteMode
}

const UploadConfigContext = React.createContext<UploadConfig>({})

/**
 * Configure uploads once — usually in your root layout — and every Upload
 * component and block uses it. Nest providers to override per section.
 *
 * @example
 * <UploadConfigProvider adapter={cloudinaryAdapter({ cloudName, uploadPreset })}>
 *   {children}
 * </UploadConfigProvider>
 */
export function UploadConfigProvider({
  children,
  ...config
}: UploadConfig & { children?: React.ReactNode }) {
  const parent = React.useContext(UploadConfigContext)
  const value = { ...parent, ...stripUndefined(config) }
  return (
    <UploadConfigContext.Provider value={value}>
      {children}
    </UploadConfigContext.Provider>
  )
}

/** The merged config from the nearest `UploadConfigProvider`s. */
export function useUploadConfig(): UploadConfig {
  return React.useContext(UploadConfigContext)
}

export function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>
}
