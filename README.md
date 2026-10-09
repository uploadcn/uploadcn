<p align="center">
  <a href="https://uploadcn.dev">
    <img src="apps/docs/app/icon.svg" width="72" height="72" alt="UploadCN" />
  </a>
</p>

<h1 align="center">UploadCN</h1>

<p align="center">
  Production-ready file uploads, built for shadcn.
</p>

<p align="center">
  <a href="https://uploadcn.dev/docs">Docs</a> ·
  <a href="https://uploadcn.dev/examples">Examples</a> ·
  <a href="https://uploadcn.dev/docs/installation">Installation</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@uploadcn/react"><img src="https://img.shields.io/npm/v/@uploadcn/react?label=%40uploadcn%2Freact&color=111" alt="npm version" /></a>
  <a href="https://github.com/uploadcn/uploadcn/actions/workflows/ci.yml"><img src="https://github.com/uploadcn/uploadcn/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-111" alt="MIT license" /></a>
</p>

---

Composable upload primitives, hooks and complete upload experiences for
[shadcn/ui](https://ui.shadcn.com): queues, concurrency, retries, chunked and resumable
uploads, presigned S3 and R2, validation, image cropping and compression, virus scanning,
OCR, offline recovery and accessible UI. You own the component source; the hard parts are
small, tested npm packages.

## Quick start

In a project set up with the shadcn CLI:

```bash
npx shadcn@latest registry add @uploadcn=https://uploadcn.dev/r/{style}/{name}.json
npx shadcn@latest add @uploadcn/file-upload @uploadcn/upload-config
```

```tsx
import { FileUpload } from "@/components/file-upload"

export default function Page() {
  return <FileUpload accept="image/*" maxSize={10_000_000} maxFiles={5} />
}
```

Then choose where files go (S3, R2, Cloudinary, local disk, your own API, or browser
only). See the [installation guide](https://uploadcn.dev/docs/installation).

## What you get

- **58 blocks, 30 of them animated.** Dropzones, avatar and gallery uploads, document
  checklists, identity verification, chat attachments, CSV import, a camera capture, and
  playful animated uploads. Browse them on the [examples page](https://uploadcn.dev/examples).
- **Your design system.** Every item compiles for all 8 shadcn styles (Vega, Nova, Maia,
  Lyra, Mira, Luma, Sera, Rhea), works on Radix, Base UI and React Aria, and converts its
  icons to your icon library (Lucide, Tabler, Hugeicons, Phosphor, Remix Icon) on install.
- **Any storage.** Direct-to-bucket uploads to S3 and R2 with a small signing route,
  Cloudinary, local disk, any custom upload function, or browser-only for forms.
- **Built for real traffic.** Concurrency limits, retries with backoff, multipart and
  resumable uploads, pause and resume, offline recovery, server-side scan and processing
  states.
- **Accessible and typed.** Keyboard and screen reader support, automated axe checks, and
  TypeScript from the engine to the route.
- **Works with AI tools.** Standard shadcn registry, so the shadcn MCP server, `llms.txt`
  and every coding agent can find and install components.

## Packages

| Layer                       | Package                                    | Delivery                                  |
| --------------------------- | ------------------------------------------ | ----------------------------------------- |
| Styled components & blocks  | [`apps/docs/registry`](apps/docs/registry) | shadcn registry, copied into your project |
| Hooks & headless primitives | [`@uploadcn/react`](packages/react)        | npm                                       |
| Upload engine & adapters    | [`@uploadcn/core`](packages/core)          | npm                                       |
| Upload route, scan, OCR     | [`@uploadcn/server`](packages/server)      | npm                                       |

The registry components install the npm packages they need, so most projects never
install them by hand.

## Repository

```text
apps/
  docs/                    Next.js + Fumadocs: docs, live examples, the registry
    registry/default/      registry source (ui, blocks, hooks, route and config files)
    registry/styles/       per-style `cn-upload-*` classes (generated from shadcn's styles)
    registry.json          registry definition, built to public/r for every style
    examples/              live examples rendered in the docs
    content/docs/          documentation (MDX)
    scripts/               style, icon and registry builds, install tests
    test/                  registry standards, security and block behavior suites
packages/
  core/                    @uploadcn/core
  react/                   @uploadcn/react
  server/                  @uploadcn/server
  eslint-config/           shared ESLint config
  typescript-config/       shared tsconfig
```

## Development

Requires Node.js 20.9 or later and pnpm 10.

```bash
pnpm install
pnpm registry:build   # compile the registry once
pnpm dev              # packages in watch mode + docs at http://localhost:3000
pnpm check            # lint, typecheck, test and build everything
```

| Script                                 |                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `pnpm build`                           | Build the packages, the registry and the docs                                   |
| `pnpm test`                            | Unit, integration and registry suites (Vitest)                                  |
| `pnpm lint` / `pnpm typecheck`         | Across all workspaces                                                           |
| `pnpm format` / `pnpm format:check`    | Prettier                                                                        |
| `pnpm registry:build`                  | Regenerate styles and icons, rebuild `apps/docs/public/r` for all 8 styles      |
| `pnpm --filter docs registry:validate` | Validate `registry.json`                                                        |
| `pnpm --filter docs test:install`      | Install every item into fresh Radix, Base UI and React Aria apps (docs running) |

The docs include a real upload route (`apps/docs/app/api/upload`). Without credentials it
uses in-memory development storage. To upload to a real bucket, copy
`apps/docs/.env.example` to `apps/docs/.env.local` and fill in the S3 or R2 variables.

## Contributing

Issues and pull requests are welcome. Read the [contributing guide](CONTRIBUTING.md)
first; for security issues, see [SECURITY.md](SECURITY.md).

Releases are automated: pull requests that change a package include a changeset, a
"Release packages" PR collects them, and merging it publishes to npm from GitHub
Actions with provenance. The docs and registry deploy to [uploadcn.dev](https://uploadcn.dev)
on every merge to `main`.

## Acknowledgements

Built on [shadcn/ui](https://ui.shadcn.com). The per-style classes are derived from
shadcn's style files (MIT), vendored in `apps/docs/styles/shadcn`.

## License

[MIT](LICENSE)
