import {
  getImageDimensions,
  getMediaDuration,
  isAudio,
  isImage,
  isVideo,
} from "./media"
import { formatBytes, formatDuration, getFileExtension } from "./utils"

export type ValidationCode =
  | "file-invalid-type"
  | "file-too-large"
  | "file-too-small"
  | "too-many-files"
  | "too-few-files"
  | "duplicate"
  | "image-too-small"
  | "image-too-large"
  | "media-too-long"
  | "media-too-short"
  | "unreadable"
  | "custom"

export interface ValidationIssue {
  code: ValidationCode
  message: string
}

export interface ValidatorContext {
  signal: AbortSignal
}

/**
 * A custom validator. Return a message or issue to reject the file, or
 * nothing to accept it. May be async (e.g. a server-side name check).
 */
export type FileValidator = (
  file: File,
  context: ValidatorContext
) =>
  | string
  | ValidationIssue
  | null
  | undefined
  | void
  | Promise<string | ValidationIssue | null | undefined | void>

export interface ImageConstraints {
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

export interface MediaConstraints {
  /** Seconds. */
  minDuration?: number
  /** Seconds. */
  maxDuration?: number
}

export interface ValidationOptions {
  /**
   * Accepted types, in the same syntax as `<input accept>`:
   * MIME types (`image/png`), wildcards (`image/*`) or extensions (`.pdf`).
   */
  accept?: string | readonly string[]
  /** Maximum size per file, in bytes. */
  maxSize?: number
  /** Minimum size per file, in bytes. */
  minSize?: number
  /** Maximum number of files in the queue. */
  maxFiles?: number
  /** Minimum number of files required (checked by `validateFileCount`). */
  minFiles?: number
  image?: ImageConstraints
  media?: MediaConstraints
  validate?: FileValidator | readonly FileValidator[]
}

/** Normalizes `accept` into a list of lower-cased tokens. */
export function parseAccept(accept: ValidationOptions["accept"]): string[] {
  if (!accept) return []
  const list = typeof accept === "string" ? accept.split(",") : accept
  return list.map((token) => token.trim().toLowerCase()).filter(Boolean)
}

/** Serializes `accept` for an `<input type="file" accept>` attribute. */
export function toAcceptAttribute(accept: ValidationOptions["accept"]) {
  const tokens = parseAccept(accept)
  return tokens.length ? tokens.join(",") : undefined
}

const EXTENSION_TYPES: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
}

/** The file's MIME type, inferred from its extension when the OS omits it. */
export function getFileType(file: { name: string; type: string }) {
  return (
    file.type.toLowerCase() ||
    EXTENSION_TYPES[getFileExtension(file.name)] ||
    ""
  )
}

export function matchesAccept(
  file: { name: string; type: string },
  accept: ValidationOptions["accept"]
): boolean {
  const tokens = parseAccept(accept)
  if (tokens.length === 0) return true
  const type = getFileType(file)
  const extension = `.${getFileExtension(file.name)}`
  return tokens.some((token) => {
    if (token === "*" || token === "*/*") return true
    if (token.startsWith(".")) return extension === token
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1))
    return type === token
  })
}

function describeAccept(accept: ValidationOptions["accept"]) {
  return parseAccept(accept)
    .map((token) =>
      token.endsWith("/*")
        ? `${token.slice(0, -2)} files`
        : token.startsWith(".")
          ? token.slice(1).toUpperCase()
          : (token.split("/")[1]?.toUpperCase() ?? token)
    )
    .join(", ")
}

function toIssue(result: string | ValidationIssue): ValidationIssue {
  return typeof result === "string"
    ? { code: "custom", message: result }
    : result
}

/** Synchronous checks that only need the File object. */
export function validateFileSync(
  file: File,
  options: ValidationOptions
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!matchesAccept(file, options.accept)) {
    issues.push({
      code: "file-invalid-type",
      message: `File type not allowed. Accepted: ${describeAccept(options.accept)}`,
    })
  }
  if (options.maxSize != null && file.size > options.maxSize) {
    issues.push({
      code: "file-too-large",
      message: `File is larger than ${formatBytes(options.maxSize)}`,
    })
  }
  if (options.minSize != null && file.size < options.minSize) {
    issues.push({
      code: "file-too-small",
      message: `File is smaller than ${formatBytes(options.minSize)}`,
    })
  }
  return issues
}

async function validateImage(
  file: File,
  constraints: ImageConstraints
): Promise<ValidationIssue[]> {
  let dimensions
  try {
    dimensions = await getImageDimensions(file)
  } catch {
    return [{ code: "unreadable", message: "Image could not be read" }]
  }
  const { width, height } = dimensions
  const { minWidth = 0, minHeight = 0, maxWidth, maxHeight } = constraints
  if (width < minWidth || height < minHeight) {
    return [
      {
        code: "image-too-small",
        message: `Image must be at least ${minWidth}×${minHeight}px (got ${width}×${height}px)`,
      },
    ]
  }
  if (
    (maxWidth != null && width > maxWidth) ||
    (maxHeight != null && height > maxHeight)
  ) {
    return [
      {
        code: "image-too-large",
        message: `Image must be at most ${maxWidth ?? "∞"}×${maxHeight ?? "∞"}px (got ${width}×${height}px)`,
      },
    ]
  }
  return []
}

async function validateMedia(
  file: File,
  constraints: MediaConstraints,
  signal: AbortSignal
): Promise<ValidationIssue[]> {
  let duration
  try {
    duration = await getMediaDuration(file, { signal })
  } catch {
    return [{ code: "unreadable", message: "Media could not be read" }]
  }
  if (constraints.maxDuration != null && duration > constraints.maxDuration) {
    return [
      {
        code: "media-too-long",
        message: `Must be ${formatDuration(constraints.maxDuration)} or shorter`,
      },
    ]
  }
  if (constraints.minDuration != null && duration < constraints.minDuration) {
    return [
      {
        code: "media-too-short",
        message: `Must be at least ${formatDuration(constraints.minDuration)}`,
      },
    ]
  }
  return []
}

/**
 * Runs every per-file rule: type, size, image dimensions, media duration and
 * custom validators. Cheap checks run first; expensive ones only if they pass.
 */
export async function validateFile(
  file: File,
  options: ValidationOptions,
  context: Partial<ValidatorContext> = {}
): Promise<ValidationIssue[]> {
  const signal = context.signal ?? new AbortController().signal
  const issues = validateFileSync(file, options)
  if (issues.length) return issues

  if (options.image && isImage(file)) {
    issues.push(...(await validateImage(file, options.image)))
  }
  if (options.media && (isVideo(file) || isAudio(file))) {
    issues.push(...(await validateMedia(file, options.media, signal)))
  }
  if (issues.length) return issues

  const validators = options.validate
    ? Array.isArray(options.validate)
      ? options.validate
      : [options.validate]
    : []
  for (const validator of validators as FileValidator[]) {
    const result = await validator(file, { signal })
    if (result) issues.push(toIssue(result))
  }
  return issues
}

/** Checks `minFiles` / `maxFiles` against a final count (e.g. on form submit). */
export function validateFileCount(
  count: number,
  options: Pick<ValidationOptions, "minFiles" | "maxFiles">
): ValidationIssue | null {
  if (options.minFiles != null && count < options.minFiles) {
    return {
      code: "too-few-files",
      message:
        options.minFiles === 1
          ? "Add at least one file"
          : `Add at least ${options.minFiles} files`,
    }
  }
  if (options.maxFiles != null && count > options.maxFiles) {
    return {
      code: "too-many-files",
      message: `You can add up to ${options.maxFiles} file${options.maxFiles === 1 ? "" : "s"}`,
    }
  }
  return null
}

export interface ValidateFilesResult {
  accepted: File[]
  rejected: { file: File; issues: ValidationIssue[] }[]
}

/**
 * Validates a selection of files against per-file rules and `maxFiles`.
 * `existingCount` is how many files are already selected.
 */
export async function validateFiles(
  files: readonly File[],
  options: ValidationOptions,
  context: Partial<ValidatorContext> & { existingCount?: number } = {}
): Promise<ValidateFilesResult> {
  const result: ValidateFilesResult = { accepted: [], rejected: [] }
  let count = context.existingCount ?? 0
  for (const file of files) {
    const issues = await validateFile(file, options, context)
    if (
      !issues.length &&
      options.maxFiles != null &&
      count >= options.maxFiles
    ) {
      issues.push({
        code: "too-many-files",
        message: `You can add up to ${options.maxFiles} file${options.maxFiles === 1 ? "" : "s"}`,
      })
    }
    if (issues.length) {
      result.rejected.push({ file, issues })
    } else {
      result.accepted.push(file)
      count++
    }
  }
  return result
}
