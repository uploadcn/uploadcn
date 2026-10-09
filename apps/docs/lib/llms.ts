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

Components work with every shadcn style (vega, nova, maia, lyra, mira, luma, sera, rhea), every base (Radix, Base UI, React Aria), every theme and every icon library. Storage is pluggable: S3, R2, Cloudinary, local disk, any API (\`createAdapter\`) or browser-only (\`localAdapter\`).

Server extras: virus scanning in the upload route (\`@uploadcn/server/scan\`: ClamAV, VirusTotal, any HTTP scanner) and OCR (\`@uploadcn/server/ocr\`: Google Vision, AWS Textract, Azure Document Intelligence, Mistral, your own service; \`tesseractOcr\` in the browser). Add the OCR route with \`npx shadcn@latest add @uploadcn/ocr-route\`.

## Use the registry

- Add the namespace (style-aware): \`npx shadcn@latest registry add @uploadcn=${url("/r/{style}/{name}.json")}\`
- Install a component: \`npx shadcn@latest add @uploadcn/file-upload\`
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
