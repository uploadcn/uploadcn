import registry from "@/registry.json"
import { siteConfig } from "@/lib/site"
import { docsLlms, source } from "@/lib/source"

const url = (path: string) => `${siteConfig.url}${path}`

const TYPE_TITLES: Record<string, string> = {
  "registry:ui": "Core components",
  "registry:block": "Blocks",
  "registry:hook": "Hooks",
  "registry:file": "Files (routes and config)",
}

/** Registry-focused summary for LLMs and coding agents (llmstxt.org). */
export async function getLlmsTxt() {
  const groups = new Map<string, typeof registry.items>()
  for (const item of registry.items) {
    const animated = item.categories?.includes("animated")
    const key = animated
      ? "Animated blocks"
      : (TYPE_TITLES[item.type] ?? "Other")
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  const sections = [...groups]
    .map(
      ([title, items]) =>
        `## ${title}\n\n${items
          .map(
            (item) =>
              `- [${item.title}](${url(`/r/${item.name}.json`)}): ${item.description} Install: \`npx shadcn@latest add @uploadcn/${item.name}\``
          )
          .join("\n")}`
    )
    .join("\n\n")

  return `# ${siteConfig.name}

> ${siteConfig.description} UploadCN is a shadcn registry (namespace \`@uploadcn\`) plus three npm packages: \`@uploadcn/core\` (framework-agnostic upload engine), \`@uploadcn/react\` (hooks and headless primitives) and \`@uploadcn/server\` (signing routes).

Components work with every shadcn style (vega, nova, maia, lyra, mira, luma, sera, rhea), every base (Radix, Base UI, React Aria), every theme and every icon library. Storage is pluggable: S3, R2, Tigris, Cloudinary, local disk, any API (\`createAdapter\`) or browser-only (\`localAdapter\`).

Server extras: virus scanning in the upload route (\`@uploadcn/server/scan\`: ClamAV, VirusTotal, any HTTP scanner) and OCR (\`@uploadcn/server/ocr\`: Google Vision, AWS Textract, Azure Document Intelligence, Mistral, your own service; \`tesseractOcr\` in the browser). Add the OCR route with \`npx shadcn@latest add @uploadcn/ocr-route\`.

Paste to upload (opt-in): add \`paste\` and an upload component takes files pasted with Ctrl+V or ⌘V while it is focused or hovered: screenshots, copied images and files copied from the file manager, several at once. \`paste="global"\` takes them from anywhere on the page. Three ways to turn it on: the \`paste\` prop on \`<Upload>\` or \`<FileUpload>\`; the \`<UploadPaste>\` wrapper (\`npx shadcn@latest add @uploadcn/upload-paste\`) around any block, animated ones included; or \`paste\` on \`UploadConfigProvider\` for the whole app. Pasted files are validated like dropped ones (\`accept\`, \`maxSize\`, \`maxFiles\`), clipboard images are named \`pasted-image-<timestamp>.png\`, and pastes into text inputs and textareas are never intercepted. \`<UploadDropzonePasteHint />\` shows "or paste with Ctrl+V / ⌘V" while paste is on. Needs \`@uploadcn/react\` 0.1.5 or later.

\`\`\`tsx
// One component (prop: paste?: boolean | "global", default false)
<FileUpload paste accept="image/*" maxSize={10_000_000} maxFiles={5} />
<Upload paste="global">…</Upload>

// Any block, without changing it (props: global, hint, disabled)
import { UploadPaste } from "@/components/upload-paste"

<UploadPaste hint>
  <RocketUpload />
</UploadPaste>

// Every upload component in the app
<UploadConfigProvider adapter={adapter} paste>{children}</UploadConfigProvider>

// A custom drop zone (headless)
const paste = useDropzonePaste({ onPaste: (files) => uploader.add(files) })
<div tabIndex={0} {...paste.handlers} />
\`\`\`

## Set up storage

- [Provider config generator](${url("/docs/storage/config-generator")}): pick Amazon S3, Cloudflare R2, Tigris or Cloudinary, enter the bucket name and allowed origins, and copy the \`.env\` template (\`S3_BUCKET\`, \`S3_REGION\`, \`S3_ACCESS_KEY_ID\`, \`S3_SECRET_ACCESS_KEY\`, optional \`S3_ENDPOINT\` and \`S3_PUBLIC_URL\`; or \`R2_ACCOUNT_ID\`, \`R2_BUCKET\`, \`R2_ACCESS_KEY_ID\`, \`R2_SECRET_ACCESS_KEY\`, optional \`R2_PUBLIC_URL\`), the bucket CORS rules in the provider's own format (S3 console JSON or AWS CLI \`CORSRules\`, R2 dashboard JSON or Wrangler \`rules\`, Tigris \`CORSRules\`) and the smallest IAM policy or token permissions.
- Browser uploads need this CORS rule on the bucket: methods \`PUT\`, allowed header \`content-type\`, exposed header \`ETag\` (multipart uploads read it), and your site's origins.
- The access key needs \`s3:PutObject\`, \`s3:GetObject\`, \`s3:DeleteObject\`, \`s3:AbortMultipartUpload\` and \`s3:ListMultipartUploadParts\` on \`arn:aws:s3:::<bucket>/*\`.
- Cloudinary needs no CORS configuration: create an unsigned upload preset and pass it to \`cloudinaryAdapter({ cloudName, uploadPreset })\`.

## Use the registry

- Install a component: \`npx shadcn@latest add @uploadcn/file-upload\` (no setup needed: \`@uploadcn\` is in the official shadcn registry directory, and the CLI installs in the project's style)
- Optional, to pin the registry in components.json: \`npx shadcn@latest registry add @uploadcn=${url("/r/{style}/{name}.json")}\`
- Registry index (all items, for agents and the shadcn MCP server): ${url("/r/registry.json")}
- Item JSON: ${url("/r/{name}.json")} (Nova) or ${url("/r/{style}/{name}.json")} (e.g. \`base-lyra\`)
- MCP: run \`npx shadcn@latest mcp init --client claude\`, then ask "show me the components in the @uploadcn registry"
- Configure storage once with \`npx shadcn@latest add @uploadcn/upload-config\` and wrap the app in \`<UploadConfig>\`

${sections}

## Docs

${await docsLlms.index()}

## Optional

- [Full documentation as one file](${url("/llms-full.txt")})
- [Every page as Markdown](${url("/llms.mdx/docs/content.md")}): append \`/content.md\` to any docs URL under /llms.mdx
`
}

/** Every docs page, processed to Markdown, in one file. */
export async function getLlmsFullTxt() {
  const pages = await Promise.all(
    source.getPages().map((page) => docsLlms.page(page))
  )
  return `# ${siteConfig.name}, full documentation\n\n${pages.join("\n\n---\n\n")}\n`
}
