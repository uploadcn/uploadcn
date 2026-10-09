export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** A cheap identity for a file: same name, size, type and mtime → same file. */
export function getFileFingerprint(file: File): string {
  return [file.name, file.size, file.type, file.lastModified].join(":")
}

export function getFileExtension(name: string): string {
  const index = name.lastIndexOf(".")
  return index > 0 ? name.slice(index + 1).toLowerCase() : ""
}

/** Wraps a Blob in a File, keeping the original name where possible. */
export function toFile(blob: File | Blob, fallback: File): File {
  if (blob instanceof File) return blob
  return new File([blob], fallback.name, {
    type: blob.type || fallback.type,
    lastModified: fallback.lastModified,
  })
}

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const

/** Formats bytes using decimal (SI) units, like the OS file manager. */
export function formatBytes(
  bytes: number,
  options: { decimals?: number } = {}
) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1000)),
    UNITS.length - 1
  )
  const value = bytes / 1000 ** exponent
  const decimals = options.decimals ?? (exponent === 0 || value >= 100 ? 0 : 1)
  // Number() drops trailing zeros: 1.0 → 1.
  return `${Number(value.toFixed(decimals))} ${UNITS[exponent]}`
}

export function formatSpeed(bytesPerSecond: number | null) {
  return bytesPerSecond == null ? "" : `${formatBytes(bytesPerSecond)}/s`
}

/** Formats a duration in seconds as `45s`, `3m 20s` or `1h 5m`. */
export function formatDuration(seconds: number | null) {
  if (seconds == null || !Number.isFinite(seconds)) return ""
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function toArray<T>(value: Iterable<T> | ArrayLike<T>): T[] {
  return Array.from(value as ArrayLike<T>)
}
