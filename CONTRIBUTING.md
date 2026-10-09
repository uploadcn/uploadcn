# Contributing to UploadCN

Thanks for helping. Bug fixes, new adapters, new blocks and docs improvements are all
welcome. For anything larger than a small fix, please open an issue first so we can
agree on the approach before you spend time on it.

## Setup

Requires Node.js 20.9 or later and pnpm 10 (`corepack enable` gives you the right
version).

```bash
git clone https://github.com/uploadcn/uploadcn.git
cd uploadcn
pnpm install
pnpm registry:build   # compile the registry once (apps/docs/public/r)
pnpm dev              # packages in watch mode + docs at http://localhost:3000
```

## Where things live

| Path                                | What                                                       |
| ----------------------------------- | ---------------------------------------------------------- |
| `packages/core`                     | `@uploadcn/core`: upload engine, validation, adapters      |
| `packages/react`                    | `@uploadcn/react`: hooks and headless primitives           |
| `packages/server`                   | `@uploadcn/server`: upload route, S3/R2 signing, scan, OCR |
| `apps/docs/registry/default/ui`     | `upload.tsx`, the styled primitives every block builds on  |
| `apps/docs/registry/default/blocks` | Blocks (one standalone file each)                          |
| `apps/docs/registry/default/hooks`  | Registry hooks shared by blocks                            |
| `apps/docs/registry/default/files`  | Route and config files the CLI scaffolds                   |
| `apps/docs/registry.json`           | Registry definition (items, files, dependencies)           |
| `apps/docs/examples`                | Live examples rendered in the docs                         |
| `apps/docs/content/docs`            | Documentation (MDX)                                        |

## Making a change

1. Create a branch from `main`.
2. Make the change, with tests where it makes sense.
3. Run the checks:

   ```bash
   pnpm check          # lint, typecheck, test, build
   pnpm format         # Prettier
   ```

4. If you changed `@uploadcn/core`, `@uploadcn/react` or `@uploadcn/server`, add a
   changeset and describe the change for the changelog:

   ```bash
   pnpm changeset
   ```

   Use `patch` for fixes and `minor` for new features while we are on 0.x. Docs and
   registry-only changes do not need a changeset; they ship when the site deploys.

5. Open a pull request. CI runs the checks and Netlify posts a deploy preview of the
   docs, so reviewers can try your change.

## Registry items

Blocks are copied into users' projects by the shadcn CLI, so they follow a few rules
that the test suite enforces:

- Import shadcn primitives from `@/components/ui/*` and `cn` from `"cn"`. Never import
  from `@workspace/*` or from another block; share logic through registry hooks.
- Use the `cn-upload-*` classes and theme tokens, not raw colors or arbitrary values.
- Use `<IconPlaceholder>` for icons so the CLI converts them to the user's icon library.
- Declare every npm package and registry item the file imports in `registry.json`.

When you add or change an item: update `registry.json`, add or update its example and
docs page, run `pnpm registry:build`, then `pnpm --filter docs test`.

## Commit messages

Short and in the imperative ("Add Supabase adapter", "Fix retry after offline"). Pull
requests are squash merged, so the PR title becomes the commit on `main`.

## Releases

Maintainers release with [Changesets](https://github.com/changesets/changesets). When
pull requests with changesets merge into `main`, a bot opens a "Release packages" PR
with the version bumps and changelogs. Merging that PR publishes to npm from GitHub
Actions, with provenance. The docs and registry deploy to uploadcn.dev on every merge
to `main`.

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Be kind.
