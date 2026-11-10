/**
 * Provider config generator: turns a provider, a bucket name and the allowed
 * origins into copy-paste configuration (.env template, CORS, permissions).
 *
 * Every format here was checked against the provider's own documentation
 * (linked per provider in `links`). The environment variable names are the
 * ones UploadCN's upload route (`registry/default/files/upload-route.ts`)
 * and storage guides read; `test/provider-config.test.ts` fails if a name
 * here is not in those files. Anything that could not be confirmed in a
 * provider's docs is marked with a TODO below and surfaced to the reader as
 * a note, never presented as fact.
 */

export type ProviderId = "s3" | "r2" | "tigris" | "cloudinary"

export interface ProviderInfo {
  id: ProviderId
  name: string
  /** What the "bucket" input means for this provider. */
  bucketLabel: string
  bucketPlaceholder: string
  /** Whether allowed origins change this provider's output. */
  usesOrigins: boolean
  /** The UploadCN guide for this provider. */
  guide: string
}

export const providers: ProviderInfo[] = [
  {
    id: "s3",
    name: "Amazon S3",
    bucketLabel: "Bucket name",
    bucketPlaceholder: "my-bucket",
    usesOrigins: true,
    guide: "/docs/adapters/s3",
  },
  {
    id: "r2",
    name: "Cloudflare R2",
    bucketLabel: "Bucket name",
    bucketPlaceholder: "my-bucket",
    usesOrigins: true,
    guide: "/docs/adapters/r2",
  },
  {
    id: "tigris",
    name: "Tigris",
    bucketLabel: "Bucket name",
    bucketPlaceholder: "my-bucket",
    usesOrigins: true,
    guide: "/docs/storage/tigris",
  },
  {
    id: "cloudinary",
    name: "Cloudinary",
    bucketLabel: "Upload preset name",
    bucketPlaceholder: "user-uploads",
    usesOrigins: false,
    guide: "/docs/storage/cloudinary",
  },
]

export function getProvider(id: ProviderId): ProviderInfo {
  const provider = providers.find((entry) => entry.id === id)
  if (!provider) throw new Error(`Unknown provider "${id}"`)
  return provider
}

export interface ProviderConfigInput {
  provider: ProviderId
  /** Bucket name, or the upload preset name for Cloudinary. */
  bucket?: string
  /** Allowed origins: a list, or one string separated by commas, spaces or lines. */
  origins?: string | readonly string[]
  /** AWS region (Amazon S3 only). */
  region?: string
}

export interface ConfigBlock {
  id: string
  title: string
  description?: string
  /** The file to save the block as, when it is a file. */
  filename?: string
  language: "bash" | "json" | "tsx"
  code: string
  /** Commands that apply the file, each copyable on its own. */
  commands?: string[]
}

export interface ConfigSection {
  id: "env" | "cors" | "access" | "client" | "cleanup"
  title: string
  description?: string
  blocks: ConfigBlock[]
  /** Things to know that are not something to paste. */
  notes?: string[]
}

export interface ConfigLink {
  label: string
  href: string
}

export interface ProviderConfig {
  provider: ProviderInfo
  /** The bucket (or preset) name used in the output. */
  bucket: string
  /** The normalized origins used in the output. */
  origins: string[]
  /** Problems with the inputs, shown above the output. */
  warnings: string[]
  sections: ConfigSection[]
  /** Official provider documentation the formats were checked against. */
  links: ConfigLink[]
}

/** The origin used until the reader types their own. */
export const PLACEHOLDER_ORIGIN = "https://your-app.com"
const DEFAULT_REGION = "us-east-1"

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i
const ORIGIN = /^(https?):\/\/([^/?#\s]+)/i

export interface ParsedOrigins {
  origins: string[]
  warnings: string[]
}

/**
 * Normalizes what people type into an origin list: splits on commas and
 * whitespace, adds a missing scheme (`https://`, or `http://` for
 * localhost), drops paths and trailing slashes, lowercases and
 * de-duplicates. `*` and wildcard hosts (`https://*.example.com`) pass
 * through.
 */
export function parseOrigins(
  input: string | readonly string[] | undefined
): ParsedOrigins {
  const tokens = (typeof input === "string" ? [input] : [...(input ?? [])])
    .flatMap((value) => value.split(/[\s,]+/))
    .map((value) => value.trim())
    .filter(Boolean)
  const origins: string[] = []
  const warnings: string[] = []
  for (const token of tokens) {
    if (token === "*") {
      origins.push("*")
      continue
    }
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(token)
    const candidate = hasScheme
      ? token
      : `${LOCAL_HOST.test(token.split("/")[0]!) ? "http" : "https"}://${token}`
    const match = ORIGIN.exec(candidate)
    if (!match) {
      warnings.push(
        `Skipped "${token}": an origin looks like https://example.com.`
      )
      continue
    }
    const origin = `${match[1]!.toLowerCase()}://${match[2]!.toLowerCase()}`
    if (origin !== token) {
      warnings.push(`Using ${origin} for "${token}".`)
    }
    origins.push(origin)
  }
  const unique = [...new Set(origins)]
  if (unique.includes("*")) {
    warnings.push(
      "* lets any website start uploads from a browser. List your own origins in production."
    )
  }
  for (const origin of unique) {
    if (origin.startsWith("http://") && !LOCAL_HOST.test(origin.slice(7))) {
      warnings.push(`${origin} is not HTTPS. Use it for local testing only.`)
    }
  }
  return { origins: unique, warnings }
}

/** Keeps names safe to drop into JSON, ARNs and shell commands. */
function cleanName(value: string | undefined, fallback: string) {
  const trimmed = (value ?? "").trim()
  const clean = trimmed.replace(/[^A-Za-z0-9._-]+/g, "")
  return {
    name: clean || fallback,
    changed: trimmed !== "" && clean !== trimmed,
  }
}

const json = (value: unknown) => JSON.stringify(value, null, 2)

/** What a browser upload needs from the bucket, in the S3 CORS vocabulary. */
function s3CorsRule(origins: string[]) {
  return {
    AllowedOrigins: origins,
    // The browser only ever PUTs: single uploads and multipart parts.
    AllowedMethods: ["PUT"],
    // The one header the browser sends (the signature locks it).
    AllowedHeaders: ["content-type"],
    // Multipart uploads read each part's ETag to finish the upload.
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  }
}

/** The S3 actions behind every call `s3Storage` makes for this bucket. */
const OBJECT_ACTIONS = [
  // PutObject, CreateMultipartUpload, UploadPart, CompleteMultipartUpload
  "s3:PutObject",
  // HeadObject (verify the upload) and GetObject (virus scanning)
  "s3:GetObject",
  // Removing files, and rejected or infected uploads
  "s3:DeleteObject",
  // Cancelled multipart uploads
  "s3:AbortMultipartUpload",
  // Resuming a multipart upload (ListParts)
  "s3:ListMultipartUploadParts",
]

function objectPolicy(bucket: string) {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: OBJECT_ACTIONS,
        Resource: `arn:aws:s3:::${bucket}/*`,
      },
    ],
  }
}

const ROUTE_NOTE =
  "Read by the upload route: npx shadcn@latest add @uploadcn/upload-route"

function s3Config(bucket: string, origins: string[], region: string) {
  const sections: ConfigSection[] = [
    {
      id: "env",
      title: "Environment variables",
      blocks: [
        {
          id: "env",
          title: ".env.local",
          filename: ".env.local",
          language: "bash",
          code: [
            `# Amazon S3. ${ROUTE_NOTE}`,
            `S3_BUCKET=${bucket}`,
            `S3_REGION=${region}`,
            "S3_ACCESS_KEY_ID=",
            "S3_SECRET_ACCESS_KEY=",
            "# Optional: a public base URL for reading files (a CDN or public bucket)",
            "# S3_PUBLIC_URL=",
          ].join("\n"),
        },
      ],
      notes: [
        "Leave S3_ENDPOINT unset for AWS: it is only for S3-compatible services.",
        "The scaffolded route uses R2 when R2_ACCOUNT_ID is set, so keep the R2_* variables out of this file.",
      ],
    },
    {
      id: "cors",
      title: "CORS",
      description:
        "The browser uploads straight to the bucket, so the bucket has to allow your origins. Use either format.",
      blocks: [
        {
          id: "cors",
          title: "S3 console",
          description:
            "Open the bucket, then Permissions, then Cross-origin resource sharing (CORS), and paste this JSON.",
          language: "json",
          code: json([s3CorsRule(origins)]),
        },
        {
          id: "cors-cli",
          title: "AWS CLI",
          description:
            "The CLI wraps the same rules in a CORSRules object. Save it as cors.json, then run the command.",
          filename: "cors.json",
          language: "json",
          code: json({ CORSRules: [s3CorsRule(origins)] }),
          commands: [
            `aws s3api put-bucket-cors --bucket ${bucket} --cors-configuration file://cors.json`,
          ],
        },
      ],
    },
    {
      id: "access",
      title: "IAM policy",
      description:
        "The least the access key behind S3_ACCESS_KEY_ID needs. Attach it to the IAM user or role that owns the key.",
      blocks: [
        {
          id: "policy",
          title: "IAM policy",
          filename: "policy.json",
          language: "json",
          code: json(objectPolicy(bucket)),
        },
      ],
      notes: [
        "s3:PutObject also covers creating, uploading the parts of and completing multipart uploads.",
        "The bucket can stay private: uploads use signed URLs, so no bucket policy or public access is needed.",
      ],
    },
    {
      id: "cleanup",
      title: "Abandoned multipart uploads",
      description:
        "Optional. Parts of uploads that are never finished are billed until removed. This lifecycle rule aborts them after 7 days.",
      blocks: [
        {
          id: "lifecycle",
          title: "Lifecycle rule",
          filename: "lifecycle.json",
          language: "json",
          code: json({
            Rules: [
              {
                ID: "abort-incomplete-multipart-uploads",
                Status: "Enabled",
                Filter: { Prefix: "" },
                AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
              },
            ],
          }),
          commands: [
            `aws s3api put-bucket-lifecycle-configuration --bucket ${bucket} --lifecycle-configuration file://lifecycle.json`,
          ],
        },
      ],
      notes: [
        "put-bucket-lifecycle-configuration replaces the bucket's whole lifecycle configuration. If the bucket already has rules, add this one to them instead.",
      ],
    },
  ]
  const links: ConfigLink[] = [
    {
      label: "Configuring CORS",
      href: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html",
    },
    {
      label: "put-bucket-cors (AWS CLI)",
      href: "https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-cors.html",
    },
    {
      label: "Multipart upload API and permissions",
      href: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html",
    },
    {
      label: "Required permissions for S3 API operations",
      href: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html",
    },
    {
      label: "Aborting incomplete multipart uploads",
      href: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpu-abort-incomplete-mpu-lifecycle-config.html",
    },
  ]
  return { sections, links }
}

function r2Config(bucket: string, origins: string[]) {
  const sections: ConfigSection[] = [
    {
      id: "env",
      title: "Environment variables",
      blocks: [
        {
          id: "env",
          title: ".env.local",
          filename: ".env.local",
          language: "bash",
          code: [
            `# Cloudflare R2. ${ROUTE_NOTE}`,
            "R2_ACCOUNT_ID=",
            `R2_BUCKET=${bucket}`,
            "R2_ACCESS_KEY_ID=",
            "R2_SECRET_ACCESS_KEY=",
            "# Optional: a custom domain or r2.dev URL for reading files",
            "# R2_PUBLIC_URL=",
          ].join("\n"),
        },
      ],
      notes: [
        "The account ID is the first part of the S3 API endpoint, https://<ACCOUNT_ID>.r2.cloudflarestorage.com.",
      ],
    },
    {
      id: "cors",
      title: "CORS",
      description:
        "R2 needs a CORS policy for browser uploads, even with signed URLs. The dashboard and Wrangler take different formats: use one of them.",
      blocks: [
        {
          id: "cors",
          title: "R2 dashboard",
          description:
            "Open the bucket, then Settings. Under CORS Policy choose Add CORS policy and paste this into the JSON tab.",
          language: "json",
          code: json([s3CorsRule(origins)]),
        },
        {
          id: "cors-cli",
          title: "Wrangler",
          description:
            "Wrangler takes a rules array with lowercase keys, not the dashboard format. Save it as cors.json, then run the command.",
          filename: "cors.json",
          language: "json",
          code: json({
            rules: [
              {
                allowed: {
                  origins,
                  methods: ["PUT"],
                  headers: ["content-type"],
                },
                exposeHeaders: ["ETag"],
                maxAgeSeconds: 3600,
              },
            ],
          }),
          commands: [
            `npx wrangler r2 bucket cors set ${bucket} --file cors.json`,
            `npx wrangler r2 bucket cors list ${bucket}`,
          ],
        },
      ],
      notes: [
        "wrangler r2 bucket cors set replaces the bucket's existing CORS rules.",
      ],
    },
    {
      id: "access",
      title: "API token",
      description:
        "R2 has no IAM policy document. Access is set on the API token that gives you the access key.",
      blocks: [],
      notes: [
        "In the R2 dashboard, create an API token with the Object Read & Write permission and scope it to this bucket.",
        "Copy the Access Key ID and Secret Access Key when the token is created: the secret is not shown again.",
        "Signed upload URLs use the S3 API domain (<ACCOUNT_ID>.r2.cloudflarestorage.com) and cannot use a custom domain. R2_PUBLIC_URL is only for reading files.",
        "Nothing to clean up: R2 buckets have a default lifecycle rule that expires incomplete multipart uploads after seven days.",
      ],
    },
  ]
  const links: ConfigLink[] = [
    {
      label: "Configure CORS",
      href: "https://developers.cloudflare.com/r2/buckets/cors/",
    },
    {
      label: "wrangler r2 bucket cors",
      href: "https://developers.cloudflare.com/workers/wrangler/commands/r2/",
    },
    {
      label: "API tokens",
      href: "https://developers.cloudflare.com/r2/api/tokens/",
    },
    {
      label: "Presigned URLs",
      href: "https://developers.cloudflare.com/r2/api/s3/presigned-urls/",
    },
    {
      label: "Object lifecycles",
      href: "https://developers.cloudflare.com/r2/buckets/object-lifecycles/",
    },
  ]
  return { sections, links }
}

const TIGRIS_S3_ENDPOINT = "https://t3.storage.dev"
const TIGRIS_IAM_ENDPOINT = "https://iam.storage.dev"

function tigrisConfig(bucket: string, origins: string[]) {
  const sections: ConfigSection[] = [
    {
      id: "env",
      title: "Environment variables",
      blocks: [
        {
          id: "env",
          title: ".env.local",
          filename: ".env.local",
          language: "bash",
          code: [
            `# Tigris (S3-compatible). ${ROUTE_NOTE}`,
            `S3_ENDPOINT=${TIGRIS_S3_ENDPOINT}`,
            "S3_REGION=auto",
            `S3_BUCKET=${bucket}`,
            "S3_ACCESS_KEY_ID=",
            "S3_SECRET_ACCESS_KEY=",
          ].join("\n"),
        },
      ],
      notes: ["Tigris access key IDs start with tid_ and secrets with tsec_."],
    },
    {
      id: "cors",
      title: "CORS",
      description:
        "Tigris takes the S3 CORS format through the S3 PutBucketCors API. You can also set the rules in the Tigris Dashboard.",
      blocks: [
        {
          id: "cors-cli",
          title: "AWS CLI",
          description: "Save it as cors.json, then run the command.",
          filename: "cors.json",
          language: "json",
          // TODO(verify): Tigris's CORS page shows AllowedOrigins,
          // AllowedHeaders, AllowedMethods and MaxAgeSeconds in its examples,
          // but not ExposeHeaders. It is part of the S3 PutBucketCors schema
          // Tigris implements; confirm it against a live bucket.
          code: json({ CORSRules: [s3CorsRule(origins)] }),
          commands: [
            `aws s3api put-bucket-cors --bucket ${bucket} --endpoint-url ${TIGRIS_S3_ENDPOINT} --cors-configuration file://cors.json`,
          ],
        },
      ],
      notes: [
        "The Tigris CORS docs show every field here except ExposeHeaders, which comes from the S3 API that Tigris implements. After applying the rule, check that a multipart upload (64 MiB or more) finishes from your site.",
      ],
    },
    {
      id: "access",
      title: "Access key",
      description:
        "The simplest setup is an access key with the Editor role on this bucket, which is what UploadCN is tested with. To grant only what uploads need, attach this IAM policy to the key instead.",
      blocks: [
        {
          id: "policy",
          title: "IAM policy",
          filename: "policy.json",
          language: "json",
          code: json(objectPolicy(bucket)),
          commands: [
            `aws iam create-policy --endpoint-url ${TIGRIS_IAM_ENDPOINT} --policy-name uploadcn-${bucket} --policy-document file://policy.json`,
            `aws iam attach-user-policy --endpoint-url ${TIGRIS_IAM_ENDPOINT} --policy-arn <policy-arn-from-the-first-command> --user-name <your-access-key-id>`,
          ],
        },
      ],
      notes: [
        "Tigris IAM policies attach to access keys: --user-name is the access key ID (tid_…).",
        // TODO(verify): Tigris also documents a ReadWrite role ("read/write
        // to selected buckets without bucket administration"). UploadCN has
        // only been tested with Editor, so the generator does not recommend
        // ReadWrite yet.
        "Give the key the Editor role or this policy. In our tests a key with no role on the bucket got Access Denied on every upload.",
      ],
    },
  ]
  const links: ConfigLink[] = [
    {
      label: "CORS",
      href: "https://www.tigrisdata.com/docs/buckets/cors/",
    },
    {
      label: "AWS CLI with Tigris",
      href: "https://www.tigrisdata.com/docs/sdks/s3/aws-cli/",
    },
    {
      label: "Access keys",
      href: "https://www.tigrisdata.com/docs/iam/manage-access-key/",
    },
    {
      label: "IAM policies",
      href: "https://www.tigrisdata.com/docs/iam/policies/",
    },
    {
      label: "Supported IAM actions",
      href: "https://www.tigrisdata.com/docs/iam/policies/supported-actions/",
    },
  ]
  return { sections, links }
}

function cloudinaryConfig(preset: string) {
  const sections: ConfigSection[] = [
    {
      id: "env",
      title: "Environment variables",
      blocks: [
        {
          id: "env",
          title: ".env.local",
          filename: ".env.local",
          language: "bash",
          code: [
            "# Cloudinary. The cloud name is public, so it can reach the browser.",
            "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=",
            "# Signed uploads only: read by your signing route, never by the browser",
            "CLOUDINARY_API_KEY=",
            "CLOUDINARY_API_SECRET=",
          ].join("\n"),
        },
      ],
      notes: [
        "cloudinaryAdapter takes these values as options, so the names are yours to change. These are the ones the UploadCN Cloudinary guide uses.",
        "Unsigned uploads only need the cloud name and the preset name. Leave the API key and secret out unless you sign uploads.",
      ],
    },
    {
      id: "cors",
      title: "CORS",
      description:
        "Nothing to configure. There is no bucket: the browser posts to Cloudinary's upload API, and Cloudinary's docs describe no CORS setting for it.",
      blocks: [],
      notes: [
        "Allowed origins do not apply to Cloudinary. Its docs describe no way to limit an unsigned preset to certain websites, and the preset name is visible in your client code.",
        "To control who uploads, restrict the preset (formats, folder) or sign uploads on your server.",
      ],
    },
    {
      id: "access",
      title: "Unsigned upload preset",
      description:
        "Create it in the Console (Settings, then Upload, then Upload Presets, then Add Upload Preset, and make it unsigned), or with the Admin API:",
      blocks: [
        {
          id: "preset",
          title: "Create the preset (Admin API)",
          description:
            "Replace the placeholders with your API key, API secret and cloud name. Edit allowed_formats to the formats you accept, or remove it.",
          language: "bash",
          code: [
            `curl -d "name=${preset}&unsigned=true&allowed_formats=jpg,png" \\`,
            "  -X POST \\",
            "  https://<API_KEY>:<API_SECRET>@api.cloudinary.com/v1_1/<cloud_name>/upload_presets",
          ].join("\n"),
        },
      ],
      notes: [
        "Upload presets have no file size limit of their own: set maxSize on the component, and your plan's limit still applies.",
        "Run the command from a terminal, not from client code: it contains your API secret.",
      ],
    },
    {
      id: "client",
      title: "Adapter",
      blocks: [
        {
          id: "adapter",
          title: "components/upload-config.tsx",
          filename: "components/upload-config.tsx",
          language: "tsx",
          code: [
            '"use client"',
            "",
            'import { cloudinaryAdapter } from "@uploadcn/core"',
            'import { UploadConfigProvider } from "@uploadcn/react"',
            "",
            "const adapter = cloudinaryAdapter({",
            "  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,",
            `  uploadPreset: "${preset}",`,
            "})",
            "",
            "export function UploadConfig({ children }: { children: React.ReactNode }) {",
            "  return <UploadConfigProvider adapter={adapter}>{children}</UploadConfigProvider>",
            "}",
          ].join("\n"),
        },
      ],
    },
  ]
  const links: ConfigLink[] = [
    {
      label: "Upload presets",
      href: "https://cloudinary.com/documentation/upload_presets",
    },
    {
      label: "Upload API: unsigned and signed uploads",
      href: "https://cloudinary.com/documentation/upload_images",
    },
    {
      label: "Admin API",
      href: "https://cloudinary.com/documentation/admin_api",
    },
    {
      label: "Generating signatures",
      href: "https://cloudinary.com/documentation/authentication_signatures",
    },
  ]
  return { sections, links }
}

/** Builds every block for one provider from the reader's inputs. */
export function generateProviderConfig(
  input: ProviderConfigInput
): ProviderConfig {
  const provider = getProvider(input.provider)
  const { name: bucket, changed } = cleanName(
    input.bucket,
    provider.bucketPlaceholder
  )
  const parsed = parseOrigins(input.origins)
  const origins = parsed.origins.length ? parsed.origins : [PLACEHOLDER_ORIGIN]
  const warnings = provider.usesOrigins ? [...parsed.warnings] : []
  if (changed) {
    warnings.unshift(
      `Using "${bucket}": names here can only contain letters, numbers, dots, hyphens and underscores.`
    )
  }
  const region = cleanName(input.region, DEFAULT_REGION).name

  const { sections, links } =
    provider.id === "s3"
      ? s3Config(bucket, origins, region)
      : provider.id === "r2"
        ? r2Config(bucket, origins)
        : provider.id === "tigris"
          ? tigrisConfig(bucket, origins)
          : cloudinaryConfig(bucket)

  return {
    provider,
    bucket,
    origins: provider.usesOrigins ? origins : [],
    warnings,
    sections,
    links,
  }
}

/** Every environment variable name a provider's `.env` template sets. */
export function getEnvNames(config: ProviderConfig): string[] {
  const env = config.sections
    .flatMap((section) => section.blocks)
    .find((block) => block.id === "env")
  return [...(env?.code.matchAll(/^(?:# )?([A-Z][A-Z0-9_]+)=/gm) ?? [])].map(
    (match) => match[1]!
  )
}
