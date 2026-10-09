import type { UploadItem, UploadStatus } from "@uploadcn/core"

/** Every user-facing string, so primitives can be translated. */
export interface UploadMessages {
  status: Record<UploadStatus, string>
  retrying: string
  waitingForNetwork: string
  /** Live-region announcements. */
  added: (count: number) => string
  uploaded: (name: string) => string
  failed: (name: string, reason: string) => string
  rejected: (name: string, reason: string) => string
  cancelled: (name: string) => string
  completed: (count: number) => string
  /** Accessible labels for item actions. */
  remove: (name: string) => string
  cancel: (name: string) => string
  retry: (name: string) => string
  pause: (name: string) => string
  resume: (name: string) => string
  progress: (name: string) => string
  totalProgress: string
}

export const defaultMessages: UploadMessages = {
  status: {
    idle: "Ready",
    validating: "Checking",
    queued: "Queued",
    uploading: "Uploading",
    paused: "Paused",
    processing: "Processing",
    scanning: "Scanning",
    success: "Uploaded",
    error: "Failed",
    cancelled: "Cancelled",
    rejected: "Rejected",
  },
  retrying: "Retrying",
  waitingForNetwork: "Waiting for network",
  added: (count) => `${count} file${count === 1 ? "" : "s"} added`,
  uploaded: (name) => `${name} uploaded`,
  failed: (name, reason) => `${name} failed: ${reason}`,
  rejected: (name, reason) => `${name} rejected: ${reason}`,
  cancelled: (name) => `${name} cancelled`,
  completed: (count) => `${count} upload${count === 1 ? "" : "s"} finished`,
  remove: (name) => `Remove ${name}`,
  cancel: (name) => `Cancel upload of ${name}`,
  retry: (name) => `Retry upload of ${name}`,
  pause: (name) => `Pause upload of ${name}`,
  resume: (name) => `Resume upload of ${name}`,
  progress: (name) => `Upload progress for ${name}`,
  totalProgress: "Total upload progress",
}

/** A status label that also explains automatic retries and offline pauses. */
export function getStatusLabel(
  item: Pick<UploadItem, "status" | "retryAt" | "pauseReason">,
  messages: UploadMessages = defaultMessages
) {
  if (item.status === "queued" && item.retryAt) return messages.retrying
  if (item.status === "paused" && item.pauseReason === "offline") {
    return messages.waitingForNetwork
  }
  return messages.status[item.status]
}
