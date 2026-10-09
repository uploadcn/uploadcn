"use client"

import {
  type CreateMultipartResponse,
  MiB,
  type SignPartResponse,
  type StoredObject,
  multipartAdapter,
  postJson,
} from "@uploadcn/core"

import { demoTransport } from "@/examples/_demo"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

/**
 * `multipartAdapter` is provider-agnostic: bring `create`, `uploadPart` and
 * `complete`. Here it talks to the same upload route as `s3Adapter`, with
 * 5 MiB parts, 3 in parallel, each retried independently.
 */
const adapter = multipartAdapter<
  { key: string; uploadId: string },
  StoredObject
>({
  partSize: 5 * MiB,
  concurrency: 3,
  create: ({ file, signal }) =>
    postJson<CreateMultipartResponse>(
      "/api/upload",
      {
        action: "create-multipart",
        file: { name: file.name, type: file.type, size: file.size },
      },
      { signal }
    ),
  async uploadPart({ session, partNumber, blob, signal, onProgress }) {
    const { url } = await postJson<SignPartResponse>(
      "/api/upload",
      { action: "sign-part", ...session, partNumber },
      { signal }
    )
    // Docs only: `demoTransport` plays the bucket when the demo has no
    // credentials. In your app, use `xhrTransport` from @uploadcn/core.
    const response = await demoTransport({
      method: "PUT",
      url,
      body: blob,
      signal,
      onUploadProgress: onProgress,
    })
    return { etag: response.headers.get("etag") ?? "" }
  },
  complete: ({ session, parts, file, signal }) =>
    postJson<StoredObject>(
      "/api/upload",
      {
        action: "complete-multipart",
        ...session,
        parts: parts.map(({ partNumber, etag }) => ({ partNumber, etag })),
        file: { name: file.name, type: file.type, size: file.size },
      },
      { signal }
    ),
  abort: ({ session }) =>
    postJson("/api/upload", { action: "abort-multipart", ...session }).then(
      () => {}
    ),
})

export default function ChunkedUploadExample() {
  return (
    <Upload adapter={adapter}>
      <UploadDropzone>
        <UploadDropzoneTitle>Drop a file larger than 10 MB</UploadDropzoneTitle>
        <UploadDropzoneDescription>
          Split into 5 MB parts · 3 in parallel · per-part retry · pausable
        </UploadDropzoneDescription>
      </UploadDropzone>
      <UploadQueue />
    </Upload>
  )
}
