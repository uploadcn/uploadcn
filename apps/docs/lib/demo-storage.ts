import {
  type UploadStorage,
  createMemoryStorage,
  createUploadRoute,
  r2Storage,
  s3Storage,
} from "@uploadcn/server"

export type DemoMode = "s3" | "r2" | "memory"

interface Demo {
  mode: DemoMode
  storage: UploadStorage
  route: ReturnType<typeof createUploadRoute>
}

/** Demo uploads are capped so the public docs can't be used as free storage. */
const MAX_DEMO_FILE_SIZE = 1024 ** 3

function createStorage(): Pick<Demo, "mode" | "storage"> {
  const env = process.env
  if (
    env.R2_ACCOUNT_ID &&
    env.R2_BUCKET &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY
  ) {
    return {
      mode: "r2",
      storage: r2Storage({
        accountId: env.R2_ACCOUNT_ID,
        bucket: env.R2_BUCKET,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        publicUrl: env.R2_PUBLIC_URL,
      }),
    }
  }
  if (
    env.S3_BUCKET &&
    env.S3_REGION &&
    env.S3_ACCESS_KEY_ID &&
    env.S3_SECRET_ACCESS_KEY
  ) {
    return {
      mode: "s3",
      storage: s3Storage({
        bucket: env.S3_BUCKET,
        region: env.S3_REGION,
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        endpoint: env.S3_ENDPOINT || undefined,
        publicUrl: env.S3_PUBLIC_URL,
      }),
    }
  }
  // No credentials: sign URLs for an in-memory bucket. The docs' examples
  // simulate that bucket in the browser (examples/_demo.ts), so file bytes
  // never reach a server function. Every call is stateless: signing needs
  // no shared state, and completion skips the existence check.
  const memory = createMemoryStorage({
    baseUrl: "/api/storage",
    secret: env.UPLOAD_DEMO_SECRET ?? crypto.randomUUID(),
  })
  return { mode: "memory", storage: memory.storage }
}

function createDemo(): Demo {
  const base = createStorage()
  return {
    ...base,
    route: createUploadRoute({
      storage: base.storage,
      maxFileSize: MAX_DEMO_FILE_SIZE,
      // In memory mode the bytes never arrive, so there's nothing to check.
      verify: base.mode !== "memory",
      getKey: ({ file }) =>
        `demo/${crypto.randomUUID()}/${file.name.replace(/[^\w.-]+/g, "-").slice(-100)}`,
      onUploadComplete: ({ file }) => ({ storage: base.mode, name: file.name }),
    }),
  }
}

const globalForDemo = globalThis as typeof globalThis & {
  __uploadcnDemo?: Demo
}

/** One instance per server process. Nothing in it is shared state. */
export function getDemo(): Demo {
  globalForDemo.__uploadcnDemo ??= createDemo()
  return globalForDemo.__uploadcnDemo
}
