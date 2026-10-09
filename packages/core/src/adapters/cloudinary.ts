import { UploadError } from "../errors"
import type { UploadAdapter, UploadItem } from "../types"
import { type MaybePromise, ensureOk, parseBody } from "./shared"
import { type Transport, xhrTransport } from "./transport"

/** The JSON Cloudinary returns for a finished upload (common fields). */
export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  url: string
  resource_type: "image" | "video" | "raw"
  format?: string
  bytes: number
  width?: number
  height?: number
  duration?: number
  version: number
  original_filename?: string
  [key: string]: unknown
}

export interface CloudinarySignature {
  signature: string
  timestamp: number | string
  apiKey: string
}

export interface CloudinaryAdapterOptions {
  cloudName: string
  /**
   * An unsigned upload preset. Fine for public, low-risk uploads; for
   * anything else use `sign` so your server decides what's allowed.
   */
  uploadPreset?: string
  /**
   * Signs the upload parameters on your server. Return the signature for
   * `{ ...params, timestamp }` — see `signCloudinaryParams` in
   * `@uploadcn/server`.
   */
  sign?: (
    params: Record<string, string>,
    item: UploadItem
  ) => MaybePromise<CloudinarySignature>
  /** Default `auto`: Cloudinary detects image, video or raw. */
  resourceType?: "auto" | "image" | "video" | "raw"
  folder?: string
  /** Extra upload parameters (tags, context, public_id…). */
  params?:
    | Record<string, string>
    | ((item: UploadItem) => MaybePromise<Record<string, string>>)
  /**
   * Files above this size upload in chunks of this size (min 5 MB) and can
   * resume after a failure. Default 20 MB.
   */
  chunkSize?: number
  /** Override the API host, e.g. for a proxy. */
  apiUrl?: string
  transport?: Transport
}

interface CloudinaryResumeState {
  uploadId: string
  offset: number
  signature?: CloudinarySignature
}

const MIN_CHUNK = 5 * 1000 * 1000

/**
 * Uploads directly from the browser to Cloudinary — unsigned with a preset,
 * or signed by your server. Large files go up in chunks and resume.
 */
export function cloudinaryAdapter(
  options: CloudinaryAdapterOptions
): UploadAdapter<CloudinaryUploadResult> {
  if (!options.uploadPreset && !options.sign) {
    throw new Error("cloudinaryAdapter needs `uploadPreset` or `sign`")
  }
  const transport = options.transport ?? xhrTransport
  const chunkSize = Math.max(MIN_CHUNK, options.chunkSize ?? 20 * 1000 * 1000)
  const api = (options.apiUrl ?? "https://api.cloudinary.com/v1_1").replace(
    /\/+$/,
    ""
  )
  const endpoint = `${api}/${options.cloudName}/${options.resourceType ?? "auto"}/upload`

  async function resolveParams(item: UploadItem) {
    const extra =
      typeof options.params === "function"
        ? await options.params(item)
        : options.params
    const params: Record<string, string> = { ...extra }
    if (options.folder) params.folder = options.folder
    if (options.uploadPreset) params.upload_preset = options.uploadPreset
    return params
  }

  function form(
    params: Record<string, string>,
    signature: CloudinarySignature | undefined,
    blob: Blob,
    name: string
  ) {
    const body = new FormData()
    for (const [key, value] of Object.entries(params)) body.append(key, value)
    if (signature) {
      body.append("api_key", signature.apiKey)
      body.append("timestamp", String(signature.timestamp))
      body.append("signature", signature.signature)
    }
    body.append("file", blob, name)
    return body
  }

  return {
    name: "cloudinary",
    resumable: (file) => file.size > chunkSize,
    async upload({
      item,
      file,
      signal,
      onProgress,
      onChunkProgress,
      resumeState,
      saveResumeState,
    }) {
      const params = await resolveParams(item)
      const previous = resumeState as CloudinaryResumeState | undefined
      const signature =
        previous?.signature ??
        (options.sign ? await options.sign(params, item) : undefined)

      const send = (
        blob: Blob,
        headers: Record<string, string>,
        base: number
      ) =>
        transport({
          method: "POST",
          url: endpoint,
          headers,
          body: form(params, signature, blob, file.name),
          signal,
          onUploadProgress: (loaded, total) =>
            onProgress(base + (total > 0 ? (loaded / total) * blob.size : 0)),
        }).then(ensureOk)

      if (file.size <= chunkSize) {
        const response = await send(file, {}, 0)
        return parseBody(response.body) as CloudinaryUploadResult
      }

      const state: CloudinaryResumeState = previous ?? {
        uploadId: crypto.randomUUID(),
        offset: 0,
        signature,
      }
      const totalChunks = Math.ceil(file.size / chunkSize)
      let result: CloudinaryUploadResult | undefined
      while (state.offset < file.size) {
        const end = Math.min(state.offset + chunkSize, file.size)
        const response = await send(
          file.slice(state.offset, end),
          {
            "x-unique-upload-id": state.uploadId,
            "content-range": `bytes ${state.offset}-${end - 1}/${file.size}`,
          },
          state.offset
        )
        state.offset = end
        saveResumeState({ ...state })
        onChunkProgress(Math.ceil(end / chunkSize), totalChunks)
        if (end === file.size) {
          result = parseBody(response.body) as CloudinaryUploadResult
        }
      }
      if (!result?.public_id) {
        throw new UploadError("Cloudinary did not return an upload result", {
          code: "http",
        })
      }
      return result
    },
  }
}
