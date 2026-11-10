/**
 * Browser helpers for reading files out of drag-and-drop and clipboard events.
 */

/** Whether a drag carries files (as opposed to text, links or elements). */
export function isFileDrag(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer) return false
  return Array.from(dataTransfer.types).includes("Files")
}

/**
 * MIME types of dragged files. Browsers expose types — but not names or
 * sizes — while dragging, which is enough to show a "reject" state early.
 */
export function getDraggedTypes(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer) return []
  return Array.from(dataTransfer.items)
    .filter((item) => item.kind === "file")
    .map((item) => item.type)
}

function readEntries(reader: FileSystemDirectoryReader) {
  return new Promise<FileSystemEntry[]>((resolve, reject) =>
    reader.readEntries(resolve, reject)
  )
}

function entryToFile(entry: FileSystemFileEntry) {
  return new Promise<File>((resolve, reject) => entry.file(resolve, reject))
}

async function walk(entry: FileSystemEntry, files: File[]): Promise<void> {
  if (entry.isFile) {
    files.push(await entryToFile(entry as FileSystemFileEntry))
    return
  }
  if (!entry.isDirectory) return
  const reader = (entry as FileSystemDirectoryEntry).createReader()
  // readEntries returns results in batches (100 in Chrome) until empty.
  for (;;) {
    const batch = await readEntries(reader)
    if (batch.length === 0) break
    for (const child of batch) await walk(child, files)
  }
}

/**
 * Extracts files from a drop, expanding dropped folders recursively.
 * Falls back to `dataTransfer.files` where the entries API is unavailable.
 */
export async function getDroppedFiles(
  dataTransfer: DataTransfer
): Promise<File[]> {
  const items = Array.from(dataTransfer.items ?? []).filter(
    (item) => item.kind === "file"
  )
  // Entries must be read synchronously, before the event handler returns.
  const entries = items.map((item) =>
    typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null
  )
  if (entries.length === 0 || entries.some((entry) => entry === null)) {
    return Array.from(dataTransfer.files)
  }
  const hasDirectory = entries.some((entry) => entry?.isDirectory)
  if (!hasDirectory) return Array.from(dataTransfer.files)
  const files: File[] = []
  for (const entry of entries) {
    if (entry) await walk(entry, files)
  }
  return files
}

const PASTED_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "text/plain": "txt",
}

/** Browsers call a pasted bitmap `image.png`, whatever it shows. */
const GENERIC_CLIPBOARD_NAME = /^image\.[a-z0-9]+$/i

/** A clipboard bitmap is created at paste time; a copied file keeps its date. */
const SYNTHESIZED_WITHIN = 5000

const pad = (value: number) => String(value).padStart(2, "0")

function pasteTimestamp(date: Date) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

function needsPastedName(file: File, now: Date) {
  if (file.name.trim() === "") return true
  return (
    GENERIC_CLIPBOARD_NAME.test(file.name) &&
    file.type.startsWith("image/") &&
    Math.abs(now.getTime() - file.lastModified) <= SYNTHESIZED_WITHIN
  )
}

export interface ClipboardFilesOptions {
  /** The paste time used in generated names. Defaults to now. */
  now?: Date
}

/**
 * Files pasted from the clipboard (screenshots, copied files).
 *
 * Clipboard images have no real file name: browsers send them unnamed or as
 * a generic `image.png`. Those are renamed `pasted-image-<timestamp>.<ext>`
 * (`pasted-file-…` for other unnamed data) so every paste gets a distinct,
 * readable name. Files copied from a file manager keep their own names.
 */
export function getClipboardFiles(
  clipboardData: DataTransfer | null | undefined,
  options: ClipboardFilesOptions = {}
) {
  if (!clipboardData) return []
  let files = Array.from(clipboardData.files ?? [])
  if (files.length === 0) {
    files = Array.from(clipboardData.items ?? [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)
  }
  const now = options.now ?? new Date()
  const stamp = pasteTimestamp(now)
  let renamed = 0
  return files.map((file) => {
    if (!needsPastedName(file, now)) return file
    renamed++
    const kind = file.type.startsWith("image/") ? "image" : "file"
    const extension =
      PASTED_EXTENSIONS[file.type] ?? file.name.split(".").pop() ?? ""
    const suffix = renamed > 1 ? `-${renamed}` : ""
    const name = `pasted-${kind}-${stamp}${suffix}${extension ? `.${extension}` : ""}`
    return new File([file], name, {
      type: file.type,
      lastModified: file.lastModified,
    })
  })
}

const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
])

/**
 * Whether an event target is somewhere the user types: a text input, a
 * textarea, a select or a `contenteditable` element. Paste and keyboard
 * shortcuts should leave those alone.
 */
export function isEditableTarget(target: EventTarget | null | undefined) {
  const element = target as Partial<HTMLInputElement> | null | undefined
  if (!element || typeof element.tagName !== "string") return false
  const tag = element.tagName.toUpperCase()
  if (tag === "TEXTAREA" || tag === "SELECT") return true
  if (tag === "INPUT") {
    return !NON_TEXT_INPUTS.has((element.type ?? "text").toLowerCase())
  }
  if (element.isContentEditable) return true
  // `isContentEditable` is not implemented everywhere (e.g. test DOMs).
  const closest = element.closest?.("[contenteditable]")
  return closest != null && closest.getAttribute("contenteditable") !== "false"
}
