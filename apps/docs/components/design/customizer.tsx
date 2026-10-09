"use client"

import * as React from "react"
import {
  CheckIcon,
  CopyIcon,
  PaletteIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react"
import { decodePreset, encodePreset } from "shadcn/preset"

import { setDesign, useDesign } from "@/components/design/use-design"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  BASE_COLORS,
  DEFAULT_DESIGN,
  type DesignConfig,
  FONTS,
  ICON_LIBRARIES,
  normalizeDesign,
  RADII,
  STYLES,
} from "@/lib/design"
import { baseThemes } from "@/lib/themes"
import { cn } from "@/lib/utils"

const SQUARE = new Set(["lyra", "sera"])

export function toPresetCode(config: DesignConfig) {
  return encodePreset({
    style: config.style,
    baseColor: config.baseColor,
    theme: config.theme,
    iconLibrary: config.iconLibrary,
    font: config.font,
    radius: config.radius,
  })
}

function fromPresetCode(code: string): DesignConfig | null {
  const decoded = decodePreset(code.trim())
  return decoded ? normalizeDesign(decoded) : null
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2.5 flex w-full items-baseline justify-between text-sm font-medium">
        {title}
        {hint ? (
          <span className="text-xs font-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </legend>
      {children}
    </fieldset>
  )
}

function Option({
  selected,
  onSelect,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        selected ? "border-foreground bg-muted" : "hover:bg-muted/60",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={copied ? "Copied" : label}
      onClick={() =>
        void navigator.clipboard.writeText(value).then(() => setCopied(true))
      }
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  )
}

function Panel({ onClose }: { onClose: () => void }) {
  const design = useDesign()
  const [code, setCode] = React.useState("")
  const [codeError, setCodeError] = React.useState(false)
  const update = (patch: Partial<DesignConfig>) =>
    setDesign({ ...design, ...patch })
  const current = toPresetCode(design)
  const isDefault = current === toPresetCode(DEFAULT_DESIGN)

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b px-5 py-4">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold">Customize</h2>
          <p className="text-xs text-muted-foreground">
            Every component on the site, in your shadcn design system.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
        <Section title="Preset" hint="from ui.shadcn.com/create">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const next = fromPresetCode(code)
              setCodeError(!next)
              if (next) {
                setDesign(next)
                setCode("")
              }
            }}
          >
            <Input
              aria-label="Preset code"
              placeholder="Paste a preset code"
              value={code}
              aria-invalid={codeError || undefined}
              onChange={(event) => {
                setCode(event.target.value)
                setCodeError(false)
              }}
            />
            <Button type="submit" variant="outline" disabled={!code.trim()}>
              Apply
            </Button>
          </form>
          {codeError ? (
            <p className="text-xs text-destructive">
              That isn&apos;t a valid preset code.
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-2.5 py-1.5 font-mono text-xs">
            <span className="truncate">
              npx shadcn@latest init --preset {current}
            </span>
            <CopyButton
              value={`npx shadcn@latest init --preset ${current}`}
              label="Copy init command"
            />
          </div>
        </Section>

        <Section title="Style">
          <div className="grid grid-cols-2 gap-1.5">
            {STYLES.map((style) => (
              <Option
                key={style.name}
                selected={design.style === style.name}
                onSelect={() =>
                  update({
                    style: style.name,
                    font: style.font,
                    iconLibrary: style.iconLibrary,
                    radius: SQUARE.has(style.name) ? "default" : design.radius,
                  })
                }
                className="flex-col items-start gap-0.5"
              >
                <span className="font-medium">{style.title}</span>
                <span className="text-muted-foreground">
                  {style.description}
                </span>
              </Option>
            ))}
          </div>
        </Section>

        <Section title="Base color">
          <div className="flex flex-wrap gap-1.5">
            {BASE_COLORS.map((name) => (
              <Option
                key={name}
                selected={design.baseColor === name}
                onSelect={() => update({ baseColor: name, theme: name })}
              >
                <span
                  className="size-3.5 rounded-full border"
                  style={{
                    background: baseThemes.find((theme) => theme.name === name)
                      ?.light["chart-2"],
                  }}
                />
                <span className="capitalize">{name}</span>
              </Option>
            ))}
          </div>
        </Section>

        <Section title="Icon library">
          <div className="flex flex-wrap gap-1.5">
            {ICON_LIBRARIES.map((library) => (
              <Option
                key={library.name}
                selected={design.iconLibrary === library.name}
                onSelect={() => update({ iconLibrary: library.name })}
              >
                {library.title}
              </Option>
            ))}
          </div>
        </Section>

        <Section title="Font">
          <div className="grid grid-cols-2 gap-1.5">
            {FONTS.map((font) => (
              <Option
                key={font.name}
                selected={design.font === font.name}
                onSelect={() => update({ font: font.name })}
                className={`font-preset-${font.name}`}
              >
                <span style={{ fontFamily: "var(--font-sans)" }}>
                  {font.title}
                </span>
              </Option>
            ))}
          </div>
        </Section>

        <Section
          title="Radius"
          hint={
            SQUARE.has(design.style) ? "Lyra and Sera are square" : undefined
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {RADII.map((radius) => (
              <Option
                key={radius.name}
                selected={design.radius === radius.name}
                onSelect={() => update({ radius: radius.name })}
                disabled={SQUARE.has(design.style)}
              >
                {radius.title}
              </Option>
            ))}
          </div>
        </Section>
      </div>

      <footer className="flex items-center justify-between gap-2 border-t px-5 py-3">
        <span className="font-mono text-xs text-muted-foreground">
          preset {current}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={isDefault}
          onClick={() => setDesign(DEFAULT_DESIGN)}
        >
          <RotateCcwIcon data-icon="inline-start" />
          Reset to default
        </Button>
      </footer>
    </div>
  )
}

/** The header button and the sheet. Also applies `?preset=` links. */
export function DesignCustomizer() {
  const ref = React.useRef<HTMLDialogElement>(null)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const url = new URL(window.location.href)
    const preset = url.searchParams.get("preset")
    if (!preset) return
    const next = fromPresetCode(preset)
    if (next) setDesign(next)
    url.searchParams.delete("preset")
    window.history.replaceState(null, "", url)
  }, [])

  React.useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <PaletteIcon data-icon="inline-start" />
        Customize
      </Button>
      <dialog
        ref={ref}
        aria-label="Customize"
        onCancel={(event) => {
          event.preventDefault()
          setOpen(false)
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false)
        }}
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-sm border-l bg-popover p-0 text-popover-foreground shadow-xl backdrop:bg-black/30 open:animate-in open:slide-in-from-right motion-reduce:open:animate-none"
      >
        {open ? <Panel onClose={() => setOpen(false)} /> : null}
      </dialog>
    </>
  )
}
