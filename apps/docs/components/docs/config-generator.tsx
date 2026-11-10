"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRightIcon, CheckIcon, CopyIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  type ConfigBlock,
  type ConfigSection,
  type ProviderId,
  PLACEHOLDER_ORIGIN,
  generateProviderConfig,
  providers,
} from "@/lib/provider-config"
import { cn } from "@/lib/utils"

const LOCALHOST = "http://localhost:3000"
const noSubscribe = () => () => {}

/** `?provider=r2` preselects a provider, so guides can link straight to it. */
function readProviderParam(): ProviderId | null {
  const value = new URLSearchParams(window.location.search).get("provider")
  return providers.some((entry) => entry.id === value)
    ? (value as ProviderId)
    : null
}

function CopyButton({
  text,
  label,
  className,
}: {
  text: string
  /** What is copied, e.g. ".env.local": the button reads "Copy .env.local". */
  label: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <Button
      variant="ghost"
      size="sm"
      data-copied={copied || undefined}
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
      className={cn("text-muted-foreground", className)}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => setCopied(true))
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span aria-hidden>{copied ? "Copied" : "Copy"}</span>
    </Button>
  )
}

function Block({ block }: { block: ConfigBlock }) {
  const name = block.filename ?? block.title
  return (
    <div data-block={block.id} className="flex flex-col gap-2">
      {block.description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {block.description}
        </p>
      ) : null}
      <figure className="overflow-hidden rounded-xl bg-code">
        <figcaption className="flex items-center justify-between gap-2 border-b border-border/60 py-1 ps-4 pe-1.5">
          <span className="truncate font-mono text-[0.8rem] text-muted-foreground">
            {block.filename ?? block.title}
          </span>
          <CopyButton text={block.code} label={name} />
        </figcaption>
        <pre
          tabIndex={0}
          aria-label={name}
          className="overflow-x-auto p-4 font-mono text-[0.8rem] leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          <code data-language={block.language}>{block.code}</code>
        </pre>
      </figure>
      {block.commands?.map((command, index) => (
        <div
          key={command}
          data-command
          className="flex items-center gap-2 rounded-xl bg-code py-1 ps-4 pe-1.5"
        >
          <span
            aria-hidden
            className="font-mono text-[0.8rem] text-muted-foreground select-none"
          >
            $
          </span>
          {/* Long commands scroll sideways: keep that reachable by keyboard. */}
          <code
            tabIndex={0}
            className="min-w-0 flex-1 overflow-x-auto rounded-sm py-1.5 font-mono text-[0.8rem] whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {command}
          </code>
          <CopyButton
            text={command}
            label={
              block.commands!.length > 1
                ? `${name} command ${index + 1}`
                : `${name} command`
            }
          />
        </div>
      ))}
    </div>
  )
}

function Section({ section }: { section: ConfigSection }) {
  return (
    <section
      data-section={section.id}
      aria-label={section.title}
      className="flex flex-col gap-3"
    >
      <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
      {section.description ? (
        <p className="text-sm leading-relaxed">{section.description}</p>
      ) : null}
      {section.blocks.map((block, index) => (
        <React.Fragment key={block.id}>
          {section.blocks.length > 1 ? (
            <h3 className="text-sm font-medium not-first-of-type:mt-2">
              {index + 1}. {block.title}
            </h3>
          ) : null}
          <Block block={block} />
        </React.Fragment>
      ))}
      {section.notes?.length ? (
        <ul className="flex list-disc flex-col gap-1.5 ps-5 text-sm leading-relaxed text-muted-foreground">
          {section.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

/**
 * Pick a storage provider, type a bucket name and your site's origins, and
 * copy the configuration UploadCN needs: the `.env` template, the bucket
 * CORS rules in the provider's own format, and the smallest set of
 * permissions. Everything updates as you type; nothing leaves the browser.
 */
export function ConfigGenerator({
  defaultProvider = "s3",
}: {
  defaultProvider?: ProviderId
}) {
  const id = React.useId()
  // The URL is read after hydration (the page is static), then the reader's
  // own choice wins and is mirrored back so the link can be shared.
  const linked = React.useSyncExternalStore(
    noSubscribe,
    readProviderParam,
    () => null
  )
  const [chosen, setChosen] = React.useState<ProviderId | null>(null)
  const provider = chosen ?? linked ?? defaultProvider
  const setProvider = (next: ProviderId) => {
    setChosen(next)
    const url = new URL(window.location.href)
    url.searchParams.set("provider", next)
    window.history.replaceState(window.history.state, "", url)
  }
  // A bucket name and a Cloudinary preset name are different things: keep
  // them apart so switching providers doesn't carry one into the other.
  const [bucket, setBucket] = React.useState("")
  const [preset, setPreset] = React.useState("")
  const [origins, setOrigins] = React.useState("")
  const [region, setRegion] = React.useState("")

  const isCloudinary = provider === "cloudinary"
  const config = React.useMemo(
    () =>
      generateProviderConfig({
        provider,
        bucket: isCloudinary ? preset : bucket,
        origins,
        region,
      }),
    [provider, isCloudinary, bucket, preset, origins, region]
  )
  const info = config.provider
  const hasLocalhost = config.origins.includes(LOCALHOST)

  return (
    <div
      data-slot="config-generator"
      data-provider={provider}
      className="not-prose my-6 flex flex-col gap-8"
    >
      <div className="flex flex-col gap-5 rounded-xl border p-4 sm:p-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Storage provider</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {providers.map((entry) => (
              <label
                key={entry.id}
                className={cn(
                  "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors",
                  "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  entry.id === provider
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <input
                  type="radio"
                  name={`${id}-provider`}
                  value={entry.id}
                  checked={entry.id === provider}
                  onChange={() => setProvider(entry.id)}
                  className="sr-only"
                />
                {entry.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-bucket`}>{info.bucketLabel}</Label>
            <Input
              id={`${id}-bucket`}
              value={isCloudinary ? preset : bucket}
              onChange={(event) =>
                (isCloudinary ? setPreset : setBucket)(event.target.value)
              }
              placeholder={info.bucketPlaceholder}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {provider === "s3" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-region`}>Region</Label>
              <Input
                id={`${id}-region`}
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                placeholder="us-east-1"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor={`${id}-origins`}>Allowed origins</Label>
            <Textarea
              id={`${id}-origins`}
              value={origins}
              onChange={(event) => setOrigins(event.target.value)}
              placeholder={`${PLACEHOLDER_ORIGIN}\nhttp://localhost:3000`}
              aria-describedby={`${id}-origins-help`}
              disabled={!info.usesOrigins}
              autoComplete="off"
              spellCheck={false}
              rows={2}
              className="font-mono text-[0.8rem]"
            />
            <p
              id={`${id}-origins-help`}
              className="text-sm text-muted-foreground"
            >
              {info.usesOrigins
                ? "The sites your users upload from, one per line or separated by commas. Scheme and host only, no path."
                : `${info.name} has no bucket CORS, so origins do not apply.`}
            </p>
            {info.usesOrigins && !hasLocalhost ? (
              <Button
                variant="outline"
                size="xs"
                className="self-start font-mono"
                onClick={() =>
                  setOrigins((value) =>
                    value.trim()
                      ? `${value.trimEnd()}\n${LOCALHOST}`
                      : LOCALHOST
                  )
                }
              >
                <PlusIcon />
                {LOCALHOST}
              </Button>
            ) : null}
          </div>
        </div>

        <div
          role="status"
          aria-live="polite"
          data-slot="config-warnings"
          className="empty:hidden"
        >
          {config.warnings.length ? (
            <ul className="flex list-disc flex-col gap-1 ps-5 text-sm text-muted-foreground">
              {config.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div
        data-slot="config-output"
        aria-label={`${info.name} configuration`}
        role="region"
        className="flex flex-col gap-8"
      >
        {config.sections.map((section) => (
          <Section key={section.id} section={section} />
        ))}

        <section aria-label="Documentation" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Official {info.name} docs
          </h2>
          <p className="text-sm leading-relaxed">
            These formats were checked against the pages below. Providers change
            their consoles and APIs, so follow the links when something does not
            match. The full UploadCN setup is in the{" "}
            <Link
              href={info.guide}
              className="font-medium underline underline-offset-4"
            >
              {info.name} guide
            </Link>
            .
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {config.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
                >
                  {link.label}
                  <ArrowUpRightIcon aria-hidden className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
