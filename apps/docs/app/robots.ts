import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/seo"

/** AI assistants and answer engines that may read the docs. */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "DuckAssistBot",
]

export default function robots(): MetadataRoute.Robots {
  // /view renders bare examples for iframes; /api is not content.
  const disallow = ["/api/", "/view/"]
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      {
        userAgent: AI_CRAWLERS,
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  }
}
