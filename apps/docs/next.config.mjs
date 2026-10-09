import { createMDX } from "fumadocs-mdx/next"

const withMDX = createMDX()

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // `{style}` registry URLs: /r/base-lyra/upload.json → the Lyra build.
      // UploadCN works on every base, so only the style picks the files.
      {
        source:
          "/r/:base(base|radix|aria)-:style(vega|nova|maia|lyra|mira|luma|sera|rhea)/:name",
        destination: "/r/styles/:style/:name",
      },
      // Older shadcn styles get the default (nova) build.
      {
        source: "/r/:legacy(new-york-v4|new-york|default)/:name",
        destination: "/r/:name",
      },
    ]
  },
  async headers() {
    return [
      {
        // The shadcn CLI fetches registry items from any origin.
        source: "/r/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=86400",
          },
        ],
      },
    ]
  },
}

export default withMDX(config)
