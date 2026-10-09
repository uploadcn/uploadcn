"use client"

import * as React from "react"
import {
  type BackgroundCapabilities,
  MiB,
  getBackgroundCapabilities,
  requestPersistentStorage,
  s3Adapter,
} from "@uploadcn/core"
import { CheckIcon, MinusIcon } from "lucide-react"

import { demoTransport } from "@/examples/_demo"
import { Button } from "@/components/ui/button"
import {
  UploadProvider,
  UploadQueuePanel,
} from "@/registry/default/blocks/global-upload"
import { UploadTrigger } from "@/registry/default/ui/upload"

const adapter = s3Adapter({
  endpoint: "/api/upload",
  transport: demoTransport, // docs only, see examples/_demo.ts
  multipart: { threshold: 5 * MiB, partSize: 5 * MiB },
})

const LABELS: Record<keyof BackgroundCapabilities, string> = {
  persistence: "IndexedDB file persistence",
  persistentStorage: "Persistent storage (eviction protection)",
  webLocks: "Web Locks (one tab resumes each upload)",
  backgroundFetch: "Background Fetch (Chromium only, needs a service worker)",
}

/**
 * Uploads live in an app-level provider, survive navigation, and, with
 * `persist`: survive reloads and crashes: they come back paused and resume
 * from the last finished part. Browsers can't keep JS uploads running after
 * the tab closes; this is the honest, cross-browser approach.
 */
export default function BackgroundUploadExample() {
  return (
    <UploadProvider adapter={adapter} persist guard>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <UploadTrigger variant="default">
            Upload in the background
          </UploadTrigger>
          <PersistButton />
        </div>
        <Capabilities />
      </div>
      <UploadQueuePanel />
    </UploadProvider>
  )
}

function PersistButton() {
  const [granted, setGranted] = React.useState<boolean | null>(null)
  return (
    <Button
      variant="outline"
      onClick={async () => setGranted(await requestPersistentStorage())}
    >
      {granted === null
        ? "Request durable storage"
        : granted
          ? "Storage is durable"
          : "Browser declined"}
    </Button>
  )
}

let detected: BackgroundCapabilities | null = null
const subscribe = () => () => {}
// Feature detection only runs in the browser; the server renders nothing.
const getCapabilities = () => (detected ??= getBackgroundCapabilities())

function Capabilities() {
  const capabilities = React.useSyncExternalStore(
    subscribe,
    getCapabilities,
    () => null
  )
  if (!capabilities) return null
  return (
    <ul
      className="flex flex-col gap-1.5 text-sm"
      aria-label="Browser capabilities"
    >
      {(Object.keys(LABELS) as (keyof BackgroundCapabilities)[]).map((key) => (
        <li key={key} className="flex items-center gap-2">
          {capabilities[key] ? (
            <CheckIcon className="size-4" aria-label="Supported" />
          ) : (
            <MinusIcon
              className="size-4 text-muted-foreground"
              aria-label="Not supported"
            />
          )}
          <span
            className={capabilities[key] ? undefined : "text-muted-foreground"}
          >
            {LABELS[key]}
          </span>
        </li>
      ))}
    </ul>
  )
}
