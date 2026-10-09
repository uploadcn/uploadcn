export const KiB = 1024
export const MiB = 1024 * KiB
export const GiB = 1024 * MiB

export interface PartSizeOptions {
  /** Smallest allowed part, except the last one. S3/R2: 5 MiB. */
  minPartSize?: number
  /** Most parts allowed per upload. S3/R2: 10 000. */
  maxParts?: number
}

/**
 * Picks a part size that respects provider limits: at least `minPartSize`,
 * and large enough that the file fits in `maxParts` parts.
 */
export function getPartSize(
  fileSize: number,
  preferred = 8 * MiB,
  { minPartSize = 5 * MiB, maxParts = 10_000 }: PartSizeOptions = {}
): number {
  const required = Math.ceil(fileSize / maxParts)
  return Math.max(preferred, minPartSize, required)
}

export interface Chunk {
  /** 1-based, matching S3 part numbers. */
  partNumber: number
  start: number
  end: number
  size: number
}

/** Splits `fileSize` bytes into chunks of `chunkSize` (the last may be smaller). */
export function createChunks(fileSize: number, chunkSize: number): Chunk[] {
  if (chunkSize <= 0) throw new RangeError("chunkSize must be positive")
  const count = Math.max(1, Math.ceil(fileSize / chunkSize))
  return Array.from({ length: count }, (_, index) => {
    const start = index * chunkSize
    const end = Math.min(start + chunkSize, fileSize)
    return { partNumber: index + 1, start, end, size: end - start }
  })
}
