/**
 * The JSON protocol spoken between `s3Adapter` (browser) and an upload route
 * on your server (`@uploadcn/server`, or your own implementation). One POST
 * endpoint, dispatched on `action`.
 */

export interface FileDescriptor {
  name: string
  type: string
  size: number
}

export type UploadRouteRequest =
  | {
      action: "presign"
      file: FileDescriptor
      meta?: Record<string, unknown>
    }
  | {
      action: "complete"
      key: string
      file: FileDescriptor
      meta?: Record<string, unknown>
    }
  | {
      action: "create-multipart"
      file: FileDescriptor
      meta?: Record<string, unknown>
    }
  | {
      action: "sign-part"
      key: string
      uploadId: string
      partNumber: number
    }
  | {
      action: "list-parts"
      key: string
      uploadId: string
    }
  | {
      action: "complete-multipart"
      key: string
      uploadId: string
      parts: { partNumber: number; etag: string }[]
      file: FileDescriptor
      meta?: Record<string, unknown>
    }
  | {
      action: "abort-multipart"
      key: string
      uploadId: string
    }

export type UploadRouteAction = UploadRouteRequest["action"]

export interface PresignResponse {
  key: string
  url: string
  method: "PUT"
  headers: Record<string, string>
}

export interface CreateMultipartResponse {
  key: string
  uploadId: string
}

export interface SignPartResponse {
  url: string
}

export interface ListPartsResponse {
  /** `null` when the storage can't list parts; the client keeps its own record. */
  parts: { partNumber: number; etag: string; size: number }[] | null
}

/** Returned by `complete` and `complete-multipart`. */
export interface StoredObject {
  key: string
  /** Public or app URL of the object. */
  url: string
  bucket?: string
  etag?: string
  /** Anything your `onUploadComplete` hook returned. */
  data?: unknown
  /** The virus scan verdict, when the route scans uploads. */
  scan?: { status: "clean" | "unknown"; scanner: string }
}
