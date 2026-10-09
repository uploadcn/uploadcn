import { createUploadRoute, r2Storage, s3Storage } from "@uploadcn/server"
import { clamavScanner, virusTotalScanner } from "@uploadcn/server/scan"

/**
 * Signs direct-to-bucket uploads for `s3Adapter({ endpoint: "/api/upload" })`.
 * Set either the S3_* or the R2_* environment variables.
 */
const storage = process.env.R2_ACCOUNT_ID
  ? r2Storage({
      accountId: process.env.R2_ACCOUNT_ID,
      bucket: process.env.R2_BUCKET!,
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      publicUrl: process.env.R2_PUBLIC_URL,
    })
  : s3Storage({
      bucket: process.env.S3_BUCKET!,
      region: process.env.S3_REGION!,
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      endpoint: process.env.S3_ENDPOINT || undefined,
      publicUrl: process.env.S3_PUBLIC_URL,
    })

/**
 * Optional malware scanning before an upload completes: set CLAMAV_HOST to
 * stream files to clamd, or VIRUSTOTAL_API_KEY to check their hashes.
 * Infected files are deleted and shown as rejected in the UI.
 */
const scan = process.env.CLAMAV_HOST
  ? {
      scanner: clamavScanner({
        host: process.env.CLAMAV_HOST,
        port: Number(process.env.CLAMAV_PORT || 3310),
      }),
      // Fail closed: files clamd can't scan are removed.
      onUnknown: "reject" as const,
    }
  : process.env.VIRUSTOTAL_API_KEY
    ? {
        scanner: virusTotalScanner({ apiKey: process.env.VIRUSTOTAL_API_KEY }),
        // Hash lookups only know files VirusTotal has seen; allow the rest.
        onUnknown: "allow" as const,
      }
    : undefined

export const { POST } = createUploadRoute({
  storage,
  maxFileSize: 5 * 1024 ** 3,
  scan,
  async authorize() {
    // Authenticate the request here and throw `UploadRouteError` to deny:
    // const session = await auth()
    // if (!session) throw new UploadRouteError("Unauthorized", 401)
    // return { userId: session.user.id }
  },
  async onUploadComplete({ key, url, file }) {
    // Persist metadata, start processing…
    return { key, url, name: file.name }
  },
})
