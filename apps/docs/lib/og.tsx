import { readFile } from "node:fs/promises"
import path from "node:path"

import { ImageResponse } from "next/og"

export const OG_SIZE = { width: 1200, height: 630 }

const fonts = (() => {
  let loaded:
    | Promise<
        { name: string; data: Buffer; weight: 400 | 600; style: "normal" }[]
      >
    | undefined
  return () =>
    (loaded ??= (async () => {
      const dir = path.join(process.cwd(), "node_modules/geist/dist/fonts")
      const [regular, semibold, mono] = await Promise.all([
        readFile(path.join(dir, "geist-sans/Geist-Regular.ttf")),
        readFile(path.join(dir, "geist-sans/Geist-SemiBold.ttf")),
        readFile(path.join(dir, "geist-mono/GeistMono-Regular.ttf")),
      ])
      return [
        {
          name: "Geist",
          data: regular,
          weight: 400 as const,
          style: "normal" as const,
        },
        {
          name: "Geist",
          data: semibold,
          weight: 600 as const,
          style: "normal" as const,
        },
        {
          name: "Geist Mono",
          data: mono,
          weight: 400 as const,
          style: "normal" as const,
        },
      ]
    })())
})()

const clamp = (text: string, max: number) =>
  text.length > max
    ? `${text.slice(0, max - 1).replace(/[\s,.;:]+\S*$/, "")}…`
    : text

const LINE = "#262626"

/**
 * The Open Graph card for every page: dark, flat colors and three fonts, so
 * each PNG stays small (about 30 KB). Rendered at build time.
 */
export async function ogImage({
  eyebrow,
  title,
  description,
  footer,
}: {
  eyebrow: string
  title: string
  description?: string
  /** A command (`npx …`) or a path, in monospace at the bottom. */
  footer: string
}) {
  const titleSize = title.length > 42 ? 60 : title.length > 26 ? 72 : 84
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#0a0a0a",
        color: "#fafafa",
        fontFamily: "Geist",
        position: "relative",
      }}
    >
      {/* Frame lines, like a blueprint */}
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 0,
          bottom: 0,
          width: 1,
          background: LINE,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 72,
          top: 0,
          bottom: 0,
          width: 1,
          background: LINE,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 72,
          left: 0,
          right: 0,
          height: 1,
          background: LINE,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 72,
          left: 0,
          right: 0,
          height: 1,
          background: LINE,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "112px 120px 112px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="44" height="44" viewBox="0 0 24 24">
              <rect width="24" height="24" rx="6.5" fill="#fafafa" />
              <g
                fill="none"
                stroke="#0a0a0a"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="translate(-0.75 0)"
              >
                <path d="M7 9v4a5 5 0 0 0 10 0V6" />
                <path d="m14 9 3-3 3 3" />
              </g>
            </svg>
            <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.8 }}>
              UploadCN
            </div>
          </div>
          <div
            style={{ fontFamily: "Geist Mono", fontSize: 22, color: "#a3a3a3" }}
          >
            {eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 600,
              letterSpacing: -titleSize * 0.035,
              lineHeight: 1.05,
              maxWidth: 960,
            }}
          >
            {clamp(title, 70)}
          </div>
          {description ? (
            <div
              style={{
                fontSize: 30,
                color: "#a3a3a3",
                lineHeight: 1.4,
                maxWidth: 920,
              }}
            >
              {clamp(description, 150)}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            fontFamily: "Geist Mono",
            fontSize: 22,
            color: "#d4d4d4",
            border: `1px solid ${LINE}`,
            background: "#141414",
            borderRadius: 12,
            padding: "12px 20px",
          }}
        >
          {footer}
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: await fonts() }
  )
}
