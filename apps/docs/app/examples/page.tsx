import type { Metadata } from "next"

import { ExamplesGallery } from "@/components/examples/examples-gallery"
import { examples } from "@/examples/meta"
import registry from "@/registry.json"

const ITEMS = new Set(registry.items.map((item) => item.name))

/** Examples that document a registry item get its install command. */
const installs = Object.fromEntries(
  examples.flatMap((example) => {
    const name = example.href.match(/^\/docs\/components\/([\w-]+)$/)?.[1]
    return name && ITEMS.has(name)
      ? [[example.name, `npx shadcn@latest add @uploadcn/${name}`]]
      : []
  })
)

export const metadata: Metadata = {
  title: "Examples: shadcn upload components",
  description: `${examples.length} live upload components for shadcn/ui: dropzones, avatar and gallery uploads, animated uploaders, OCR, forms and more. Copy the install command for any block.`,
  alternates: { canonical: "/examples" },
}

export default function ExamplesPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-12 md:py-16">
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Examples
        </h1>
        <p className="text-muted-foreground md:text-lg">
          {examples.length} live components and patterns. Open one to see its
          code, props and variants.
        </p>
      </header>
      <ExamplesGallery installs={installs} />
    </main>
  )
}
