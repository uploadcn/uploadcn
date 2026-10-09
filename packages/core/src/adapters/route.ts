import type { UploadAdapter } from "../types"

/**
 * Picks an adapter per file — for example a plain HTTP upload for small
 * files and a chunked adapter for large ones.
 *
 * @example
 * routeAdapter((file) => (file.size > 100 * MiB ? tus : http))
 */
export function routeAdapter<TResult>(
  select: (file: File) => UploadAdapter<TResult>,
  name = "route"
): UploadAdapter<TResult> {
  return {
    name,
    resumable(file) {
      const { resumable } = select(file)
      return typeof resumable === "function" ? resumable(file) : !!resumable
    },
    upload: (context) => select(context.file).upload(context),
    async abort(context) {
      await select(context.item.file).abort?.(context)
    },
  }
}
