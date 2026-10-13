import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon, CheckIcon, HeartIcon } from "lucide-react"

import { SponsorLogos } from "@/components/sponsors/sponsor-logos"
import { SiteFooter } from "@/components/home/site-footer"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/site"
import { sponsors, tiers } from "@/lib/sponsors"
import { cn } from "@/lib/utils"

const description =
  "Sponsor UploadCN, the open-source file upload components for shadcn/ui. Put your brand in front of React developers when they decide how their app uploads files."

export const metadata: Metadata = {
  title: "Sponsor UploadCN",
  description,
  alternates: { canonical: "/sponsors" },
  openGraph: { title: "Sponsor UploadCN", description },
}

const reasons = [
  {
    title: "In the official shadcn directory",
    body: "Developers install UploadCN straight from the shadcn CLI with one command, in every shadcn style, base and icon library.",
  },
  {
    title: "Where storage gets chosen",
    body: "Every UploadCN app picks a storage adapter: S3, R2, Cloudinary, local disk or any API. That decision happens in these docs.",
  },
  {
    title: "Open source, MIT",
    body: "58 blocks, 30 of them animated, and three npm packages, built and maintained in the open on GitHub.",
  },
]

export default function SponsorsPage() {
  const supporters = sponsors.filter((s) => s.tier === "supporter")
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-4 pt-20 pb-14 text-center sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium shadow-xs">
          <HeartIcon className="size-3.5" />
          Sponsorship
        </span>
        <h1 className="text-4xl font-semibold tracking-tighter text-balance sm:text-6xl">
          Sponsor UploadCN
        </h1>
        <p className="max-w-2xl text-lg text-balance text-muted-foreground">
          UploadCN is free and open source. Sponsors keep it moving, and meet
          developers at the moment they decide how their app uploads files.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            size="lg"
            className="h-10 rounded-full px-5"
            render={
              <a
                href={siteConfig.sponsorUrl}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            nativeButton={false}
          >
            Become a sponsor
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-10 rounded-full px-5"
            render={
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            nativeButton={false}
          >
            Star on GitHub
          </Button>
        </div>
      </section>

      <section
        aria-label="Why sponsor"
        className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-20 md:grid-cols-3"
      >
        {reasons.map((reason) => (
          <div key={reason.title} className="rounded-xl border p-6">
            <h2 className="font-semibold tracking-tight">{reason.title}</h2>
            <p className="mt-2 text-sm text-pretty text-muted-foreground">
              {reason.body}
            </p>
          </div>
        ))}
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="text-sm font-medium text-muted-foreground">Tiers</p>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Pick how you show up
            </h2>
            <p className="text-balance text-muted-foreground">
              Monthly sponsorships. Logos link to your site and are marked as
              sponsored.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={cn(
                  "flex flex-col gap-4 rounded-xl border bg-background p-6",
                  tier.featured &&
                    "border-foreground/30 shadow-sm"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold tracking-tight">{tier.name}</h3>
                  {tier.featured ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      For storage platforms
                    </span>
                  ) : null}
                </div>
                <p className="text-3xl font-semibold tracking-tight">
                  ${tier.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / month
                  </span>
                </p>
                <p className="text-sm text-pretty text-muted-foreground">
                  {tier.description}
                </p>
                <ul className="flex flex-col gap-2 text-sm">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex gap-2">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={tier.featured ? "default" : "outline"}
                  className="mt-auto"
                  render={
                    <a
                      href={siteConfig.sponsorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  nativeButton={false}
                >
                  {tier.featured
                    ? "Talk about a partnership"
                    : `Sponsor as ${tier.name}`}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Sponsors</h2>
        {sponsors.length > 0 ? (
          <>
            <SponsorLogos placement="footer" title="Thank you" />
            {supporters.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {supporters.map((s) => s.name).join(", ")}
              </p>
            ) : null}
          </>
        ) : (
          <p className="max-w-md text-balance text-muted-foreground">
            No sponsors yet. Be the first, and your logo goes up across the docs
            and the README.
          </p>
        )}
        <p className="max-w-xl text-sm text-balance text-muted-foreground">
          Not a company? Starring the repo, sharing UploadCN and{" "}
          <Link
            href={`${siteConfig.links.github}/blob/main/CONTRIBUTING.md`}
            className="underline underline-offset-4 hover:text-foreground"
          >
            contributing
          </Link>{" "}
          help just as much.
        </p>
      </section>

      <SiteFooter />
    </main>
  )
}
