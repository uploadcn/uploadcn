import { estimateEta } from "./speed"
import type { UploadItem, UploadStatus } from "./types"

export interface UploadSummary {
  /** Items that count towards the queue (excludes rejected and cancelled). */
  total: number
  counts: Record<UploadStatus, number>
  loaded: number
  size: number
  /** Aggregate percent across counted items, 0–100. */
  percent: number
  /** Combined speed of active uploads in bytes/second. */
  speed: number | null
  eta: number | null
  /** Something is validating, queued, uploading, processing or scanning. */
  isUploading: boolean
  /** Every counted item finished successfully. */
  isComplete: boolean
  hasErrors: boolean
}

const STATUSES: UploadStatus[] = [
  "idle",
  "validating",
  "queued",
  "uploading",
  "paused",
  "processing",
  "scanning",
  "success",
  "error",
  "cancelled",
  "rejected",
]

/** Aggregates queue state for progress bars, badges and summaries. */
export function getUploadSummary(items: readonly UploadItem[]): UploadSummary {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
    UploadStatus,
    number
  >
  let loaded = 0
  let size = 0
  let speed = 0
  let measuring = false
  for (const item of items) {
    counts[item.status]++
    if (item.status === "rejected" || item.status === "cancelled") continue
    size += item.size
    loaded +=
      item.status === "success" ||
      item.status === "processing" ||
      item.status === "scanning"
        ? item.size
        : item.progress.loaded
    if (item.status === "uploading" && item.progress.speed != null) {
      speed += item.progress.speed
      measuring = true
    }
  }
  const total = items.length - counts.rejected - counts.cancelled
  const isUploading =
    counts.validating +
      counts.queued +
      counts.uploading +
      counts.processing +
      counts.scanning >
    0
  return {
    total,
    counts,
    loaded,
    size,
    percent:
      size === 0
        ? total > 0 && counts.success === total
          ? 100
          : 0
        : Math.round((loaded / size) * 1000) / 10,
    speed: measuring ? speed : null,
    eta: measuring ? estimateEta(loaded, size, speed) : null,
    isUploading,
    isComplete: total > 0 && counts.success === total,
    hasErrors: counts.error > 0,
  }
}
