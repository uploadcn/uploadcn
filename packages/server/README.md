# @uploadcn/server

A Web-standard (`Request` → `Response`) upload route for [UploadCN](https://uploadcn.dev):
presigned uploads and multipart signing for Amazon S3, Cloudflare R2 and S3-compatible
storage. Runs on Node.js, Bun, Deno, Cloudflare Workers and edge runtimes. Signing uses
Web Crypto via `aws4fetch`. No AWS SDK.

```bash
npm install @uploadcn/server
```

```ts
// app/api/upload/route.ts (Next.js)
import { createUploadRoute, s3Storage } from "@uploadcn/server"

export const { POST } = createUploadRoute({
  storage: s3Storage({
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION!,
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  }),
  maxFileSize: 500 * 1024 * 1024,
  allowedTypes: ["image/*", "application/pdf"],
  async authorize({ request }) {
    // throw new UploadRouteError("Unauthorized", 401)
  },
  async onUploadComplete({ key, file }) {
    // save metadata, enqueue a virus scan…
  },
})
```

Signatures lock the content type and length; completed uploads are verified with `HEAD`
before `onUploadComplete` runs.

Documentation: https://uploadcn.dev/docs/reference/server

MIT
