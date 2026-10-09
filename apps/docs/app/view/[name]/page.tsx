import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { ExampleRenderer } from "@/examples/components"
import { examples, getExample } from "@/examples/meta"

export function generateStaticParams() {
  return examples.map((example) => ({ name: example.name }))
}

export async function generateMetadata({
  params,
}: PageProps<"/view/[name]">): Promise<Metadata> {
  const example = getExample((await params).name)
  // Bare previews: keep them out of search results, point to the docs page.
  return example
    ? {
        title: example.title,
        description: example.description,
        alternates: { canonical: example.href },
        robots: { index: false, follow: true },
      }
    : {}
}

/** A single example, full page, for "open in new tab" and testing. */
export default async function ViewPage({ params }: PageProps<"/view/[name]">) {
  const example = getExample((await params).name)
  if (!example) notFound()
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5 text-sm">
        <Link
          href={example.href}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          {example.title}
        </Link>
        <span className="hidden text-muted-foreground sm:inline">
          {example.description}
        </span>
      </header>
      <main
        data-example={example.name}
        className="flex flex-1 items-center justify-center p-6 md:p-12"
      >
        <div className="flex w-full max-w-3xl justify-center">
          <ExampleRenderer name={example.name} />
        </div>
      </main>
    </div>
  )
}
