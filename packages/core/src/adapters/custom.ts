import type { UploadAdapter, UploadAdapterContext } from "../types"

export interface CreateAdapterOptions {
  /** Shown in logs and errors. Default `custom`. */
  name?: string
  /** Set when your upload can continue after an interruption. */
  resumable?: boolean | ((file: File) => boolean)
  /** Cleans up server-side state when an upload is cancelled. */
  abort?: UploadAdapter["abort"]
}

/**
 * Turns any upload function into an adapter — your own API, an SDK
 * (Supabase, Firebase, Vercel Blob, UploadThing…) or a server action.
 * Report progress with `onProgress` and honour `signal` to support cancel.
 *
 * @example
 * const adapter = createAdapter(async ({ file, signal, onProgress }) => {
 *   const { url } = await uploadToMyApi(file, { signal, onProgress })
 *   return { url }
 * })
 */
export function createAdapter<TResult>(
  upload: (context: UploadAdapterContext) => Promise<TResult>,
  options: CreateAdapterOptions = {}
): UploadAdapter<TResult> {
  return {
    name: options.name ?? "custom",
    resumable: options.resumable ?? false,
    upload,
    abort: options.abort,
  }
}
