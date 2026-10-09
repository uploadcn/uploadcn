# @uploadcn/core

The framework-agnostic upload engine behind [UploadCN](https://uploadcn.dev).

- Queue with configurable concurrency
- Retries with exponential backoff, jitter and `Retry-After`; retryable vs. permanent errors
- Pause, resume and cancel (with server-side cleanup)
- Chunked/multipart uploads with parallel parts and per-part retry
- Resumable uploads that survive reloads (IndexedDB persistence, Web Locks across tabs)
- Validation: types, sizes, counts, duplicates, image dimensions, media duration, async custom rules
- Adapters: presigned S3/R2, generic presigned, multipart, HTTP, tus, mock
- Image processing with native APIs: crop, rotate, resize, compress (EXIF-aware)
- Offline awareness, speed and ETA, typed events
- Zero runtime dependencies (tus adapter: optional `tus-js-client` peer)

```bash
npm install @uploadcn/core
```

```ts
import { createUploader, s3Adapter } from "@uploadcn/core"

const uploader = createUploader({
  adapter: s3Adapter({ endpoint: "/api/upload" }),
  accept: "image/*",
  maxSize: 10 * 1024 * 1024,
  concurrency: 3,
})

uploader.on("success", ({ item }) => console.log(item.result))
await uploader.add(input.files!)
```

Entry points: `@uploadcn/core`, `@uploadcn/core/image`, `@uploadcn/core/tus`.

Documentation: https://uploadcn.dev/docs/reference/core

MIT
