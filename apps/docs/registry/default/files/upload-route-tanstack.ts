import { createFileRoute } from "@tanstack/react-router"
import { createUploadRoute, s3Storage } from "@uploadcn/server"

/** Signs direct-to-bucket uploads for `s3Adapter({ endpoint: "/api/upload" })`. */
const upload = createUploadRoute({
  storage: s3Storage({
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION!,
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    endpoint: process.env.S3_ENDPOINT || undefined,
    publicUrl: process.env.S3_PUBLIC_URL,
  }),
  maxFileSize: 5 * 1024 ** 3,
  async authorize() {
    // Authenticate the request here and throw `UploadRouteError` to deny:
    // const session = await getSession(request)
    // if (!session) throw new UploadRouteError("Unauthorized", 401)
    // return { userId: session.user.id }
  },
  async onUploadComplete({ key, url, file }) {
    // Persist metadata, enqueue a virus scan, start processing…
    return { key, url, name: file.name }
  },
})

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: ({ request }) => upload.POST(request),
    },
  },
})
