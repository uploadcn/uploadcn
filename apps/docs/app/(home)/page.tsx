import type * as React from "react"
import type { Metadata } from "next"
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc"
import {
  ArrowRightIcon,
  BotIcon,
  CloudIcon,
  FileCheck2Icon,
  ImageIcon,
  LayersIcon,
  PlusIcon,
  PauseIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  WifiOffIcon,
} from "lucide-react"
import Link from "next/link"

import { codeBlockClassName } from "@/components/docs/code"
import { ComponentGallery } from "@/components/home/component-gallery"
import { InstallCommand } from "@/components/home/install-command"
import { Showcase } from "@/components/home/showcase"
import { SiteFooter } from "@/components/home/site-footer"
import { Button } from "@/components/ui/button"
import { ExampleRenderer } from "@/examples/components"
import { examples } from "@/examples/meta"
import { JsonLd } from "@/components/json-ld"
import { codeThemes } from "@/lib/code-themes"
import { faq } from "@/lib/faq"
import { siteJsonLd } from "@/lib/seo"
import { siteConfig } from "@/lib/site"

const COMPOSITION = `<Upload adapter={s3Adapter({ endpoint: "/api/upload" })}>
  <UploadDropzone>
    <UploadDropzoneHeader>
      <UploadDropzoneMedia variant="icon" />
      <UploadDropzoneTitle>Drop files here</UploadDropzoneTitle>
      <UploadDropzoneDescription>or click to browse</UploadDropzoneDescription>
    </UploadDropzoneHeader>
  </UploadDropzone>
  <UploadList>
    <UploadItem>
      <UploadItemMedia />
      <UploadItemContent>
        <UploadItemTitle />
        <UploadItemDescription />
      </UploadItemContent>
      <UploadItemActions />
      <UploadItemProgress />
    </UploadItem>
  </UploadList>
</Upload>`

const LIFECYCLE: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
}[] = [
  {
    icon: FileCheck2Icon,
    title: "Validate",
    body: "Types, sizes, counts, duplicates, image dimensions, durations, and your own async rules.",
  },
  {
    icon: ImageIcon,
    title: "Transform",
    body: "Crop, rotate, resize and compress in the browser. EXIF orientation handled.",
  },
  {
    icon: LayersIcon,
    title: "Queue",
    body: "Concurrency limits, batches, priorities and per-file progress, speed and ETA.",
  },
  {
    icon: CloudIcon,
    title: "Upload",
    body: "Direct to S3 or R2 with presigned URLs. Bytes never touch your server.",
  },
  {
    icon: PauseIcon,
    title: "Pause & resume",
    body: "Parallel multipart parts that resume after a pause, a dropped connection or a reload.",
  },
  {
    icon: RefreshCwIcon,
    title: "Retry",
    body: "Exponential backoff with jitter and Retry-After. Permanent errors fail fast.",
  },
  {
    icon: WifiOffIcon,
    title: "Go offline",
    body: "Uploads wait for the network and continue, without burning retries.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Scan & process",
    body: "Scan files with ClamAV or VirusTotal in your route and read text with any OCR engine. Nothing is faked in the browser.",
  },
]

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    types: { "text/plain": "/llms.txt" },
  },
}

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {children ? (
        <p className="text-balance text-muted-foreground">{children}</p>
      ) : null}
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={siteJsonLd(faq)} />
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_55%_at_50%_0%,black,transparent)] bg-[size:56px_56px] opacity-60"
        />
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-7 px-4 pt-20 pb-16 text-center sm:pt-28">
          <Link
            href="/docs/guides/ocr"
            className="group inline-flex items-center gap-2 rounded-full border bg-background py-1 ps-1 pe-3 text-xs font-medium shadow-xs transition-colors hover:bg-muted/60"
          >
            <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
              New
            </span>
            OCR and virus scanning
            <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <h1 className="max-w-4xl text-5xl leading-[1.05] font-semibold tracking-tighter text-balance sm:text-6xl lg:text-7xl">
            File uploads, built for shadcn.
          </h1>
          <p className="max-w-2xl text-lg text-balance text-muted-foreground">
            Upload components that look like the rest of your app, with a tested
            engine underneath: queues, retries, resumable transfers, any
            storage. Copy the UI and own the code.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="h-10 rounded-full px-5"
              render={<Link href="/docs" />}
              nativeButton={false}
            >
              Get started
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-10 rounded-full px-5"
              render={<Link href="/docs/components/upload" />}
              nativeButton={false}
            >
              Browse components
            </Button>
          </div>
          <InstallCommand command="npx shadcn@latest add @uploadcn/file-upload" />
          <p className="text-xs text-muted-foreground">
            Next.js · TanStack Start · Vite · React Router. Radix, Base UI or
            React Aria, in all 8 shadcn styles.
          </p>
        </div>
      </section>

      {/* Live components */}
      <section
        aria-label="Live components"
        className="mx-auto w-full max-w-7xl px-4"
      >
        <Showcase />
      </section>

      {/* Lifecycle */}
      <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-24 lg:grid-cols-[1fr_1.4fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionHeading
            eyebrow="The whole lifecycle"
            title="A dropzone is easy. Everything behind it isn't."
          >
            UploadCN handles the hard parts so your upload UI survives real
            networks, large files and impatient users.
          </SectionHeading>
          <Button
            variant="outline"
            className="mt-6 rounded-full"
            render={<Link href="/docs/how-it-works" />}
            nativeButton={false}
          >
            How it works
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2">
          {LIFECYCLE.map(({ icon: Icon, title, body }, index) => (
            <li key={title} className="flex flex-col gap-3 bg-background p-6">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/50">
                  <Icon className="size-4" />
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="font-medium">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Composition */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-24">
          <SectionHeading
            eyebrow="Composable"
            title="Compose it like any shadcn component."
          >
            Small parts with sensible defaults. Swap any of them, restyle every
            class, or drop down to the headless primitives.
          </SectionHeading>
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <ServerCodeBlock
              code={COMPOSITION}
              lang="tsx"
              themes={codeThemes}
              codeblock={{
                title: "components/attachments.tsx",
                className: `${codeBlockClassName} my-0 bg-background`,
              }}
            />
            <div className="rounded-2xl border bg-background p-6 shadow-xs">
              <ExampleRenderer name="upload-demo" />
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Components"
            title="Ready-made upload experiences."
          >
            From a single button to AI ingestion pipelines, each one a file in
            your project.
          </SectionHeading>
          <Button
            variant="outline"
            className="rounded-full"
            render={<Link href="/examples" />}
            nativeButton={false}
          >
            All {examples.length} examples
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
        <ComponentGallery />
      </section>

      {/* Engine */}
      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-24 md:grid-cols-3">
        {[
          {
            icon: CloudIcon,
            title: "Any storage",
            body: "S3, R2, Cloudinary, local disk, Supabase, tus or your own endpoint. An adapter is a single function.",
          },
          {
            icon: ShieldCheckIcon,
            title: "Secure by default",
            body: "Signed URLs lock size and type, uploads are verified and scanned before they complete, and keys never come from the client.",
          },
          {
            icon: BotIcon,
            title: "Accessible & tested",
            body: "Keyboard-first dropzones, real progressbars, live announcements, and 100+ tests on the engine.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex flex-col gap-3 rounded-2xl border p-6"
          >
            <Icon className="size-5 text-muted-foreground" />
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section
        aria-labelledby="faq"
        className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-24 lg:grid-cols-[1fr_1.6fr]"
      >
        <div className="flex max-w-2xl flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">FAQ</p>
          <h2
            id="faq"
            className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            Questions, answered.
          </h2>
          <p className="text-balance text-muted-foreground">
            Anything else? Ask on{" "}
            <a
              href={`${siteConfig.links.github}/discussions`}
              className="font-medium text-foreground underline underline-offset-4"
            >
              GitHub
            </a>
            .
          </p>
        </div>
        <div className="divide-y border-y">
          {faq.map(({ question, answer }) => (
            <details key={question} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                <h3 className="text-base">{question}</h3>
                <PlusIcon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                />
              </summary>
              <p className="pb-5 text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-24">
        <div className="relative isolate flex flex-col items-center gap-6 overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(color-mix(in_oklch,var(--primary-foreground)_18%,transparent)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] bg-[size:20px_20px]"
          />
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Ship uploads your users won&apos;t notice.
          </h2>
          <p className="max-w-xl text-balance text-primary-foreground/70">
            Add the upload route, drop in a component, and point it at your
            bucket. That&apos;s it.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              variant="secondary"
              className="h-10 rounded-full px-5"
              render={<Link href="/docs/installation" />}
              nativeButton={false}
            >
              Install UploadCN
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
