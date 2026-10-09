import type { Metadata, Viewport } from "next"
import { RootProvider } from "fumadocs-ui/provider/next"
import {
  DM_Sans,
  Figtree,
  Geist,
  Geist_Mono,
  Inter,
  JetBrains_Mono,
  Manrope,
  Noto_Sans,
  Outfit,
} from "next/font/google"

import "./globals.css"

import { DemoUploadConfig } from "@/components/demo-upload-config"
import {
  CommandMenu,
  SearchEntriesProvider,
} from "@/components/search/command-menu"
import { Toaster } from "@/components/ui/sonner"
import {
  applyStoredDesignScript,
  BASE_COLORS,
  DEFAULT_DESIGN,
  DESIGN_CLASS_PREFIXES,
  DESIGN_STORAGE_KEY,
  designAttributes,
} from "@/lib/design"
import { getSearchIndex } from "@/lib/search-index"
import { keywords } from "@/lib/seo"
import { siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
// Fonts used by shadcn presets, loaded on demand when a preset picks them.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  preload: false,
})
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  preload: false,
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  preload: false,
})
const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  preload: false,
})
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  preload: false,
})
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  preload: false,
})
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  preload: false,
})
const presetFonts = [
  inter,
  figtree,
  jetbrainsMono,
  notoSans,
  dmSans,
  outfit,
  manrope,
]

const designScript = `(${applyStoredDesignScript.toString()})(${JSON.stringify(DESIGN_STORAGE_KEY)}, ${JSON.stringify(DESIGN_CLASS_PREFIXES)}, ${JSON.stringify(DEFAULT_DESIGN)}, ${JSON.stringify(BASE_COLORS)})`
const defaults = designAttributes(DEFAULT_DESIGN)

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name}: ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords,
  authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
  creator: siteConfig.author.name,
  publisher: siteConfig.name,
  category: "technology",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: siteConfig.name,
    title: `${siteConfig.name}: ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name}: ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  formatDetection: { telephone: false, email: false, address: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "antialiased",
        geist.variable,
        mono.variable,
        presetFonts.map((font) => font.variable),
        defaults.classes
      )}
      data-icon-library={defaults.iconLibrary}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: designScript }} />
      </head>
      <body className="flex min-h-svh flex-col">
        <SearchEntriesProvider entries={getSearchIndex()}>
          <RootProvider search={{ SearchDialog: CommandMenu }}>
            <DemoUploadConfig>{children}</DemoUploadConfig>
            <Toaster />
          </RootProvider>
        </SearchEntriesProvider>
      </body>
    </html>
  )
}
