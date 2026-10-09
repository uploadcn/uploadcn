export interface PresignedRequest {
  url: string
  /** Headers the client must send unchanged (they are part of the signature). */
  headers: Record<string, string>
}

export interface StoredObjectInfo {
  size: number
  etag?: string
  contentType?: string
}

export interface StoragePart {
  partNumber: number
  etag: string
  size: number
}

/**
 * The server-side half of an upload: signing and finalizing. Implement it to
 * support any S3-compatible store, or a completely different backend.
 */
export interface UploadStorage {
  /** Short identifier, used in logs and errors. */
  readonly name: string
  presignPut(input: {
    key: string
    contentType: string
    contentLength: number
    expiresIn: number
  }): Promise<PresignedRequest>
  createMultipart(input: {
    key: string
    contentType: string
  }): Promise<{ uploadId: string }>
  presignPart(input: {
    key: string
    uploadId: string
    partNumber: number
    expiresIn: number
  }): Promise<string>
  /** Parts stored so far, or `null` if this storage can't list them. */
  listParts(input: {
    key: string
    uploadId: string
  }): Promise<StoragePart[] | null>
  completeMultipart(input: {
    key: string
    uploadId: string
    parts: { partNumber: number; etag: string }[]
  }): Promise<{ etag?: string }>
  abortMultipart(input: { key: string; uploadId: string }): Promise<void>
  /**
   * Object metadata, `null` if it doesn't exist, or `undefined` if this
   * storage can't check (verification is then skipped).
   */
  headObject(key: string): Promise<StoredObjectInfo | null | undefined>
  deleteObject(key: string): Promise<void>
  /**
   * The object's bytes, or `null` if it doesn't exist. Optional; needed to
   * scan or OCR files after they are stored.
   */
  getObject?(key: string): Promise<ReadableStream<Uint8Array> | null>
  /** A URL the app can use to read the object (public or signed). */
  getUrl(key: string): Promise<string>
}
