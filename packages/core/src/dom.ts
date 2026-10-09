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

/** Files pasted from the clipboard (screenshots, copied files). */
export function getClipboardFiles(clipboardData: DataTransfer | null) {
  if (!clipboardData) return []
  const files = Array.from(clipboardData.files)
  if (files.length) return files
  return Array.from(clipboardData.items)
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null)
}
