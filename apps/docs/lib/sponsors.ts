/**
 * Sponsorship tiers and current sponsors. Adding a sponsor is one entry in
 * `sponsors`: their logo then appears in every placement their tier includes.
 */

export type SponsorTier = "partner" | "silver" | "bronze" | "supporter"

export interface Sponsor {
  name: string
  url: string
  tier: SponsorTier
  /** Logo in /public/sponsors (SVG preferred). Supporters are listed by name. */
  logo?: string
}

export const sponsors: Sponsor[] = []

export const tiers: {
  id: SponsorTier | "backer"
  name: string
  price: number
  description: string
  perks: string[]
  featured?: boolean
}[] = [
  {
    id: "partner",
    name: "Storage partner",
    price: 299,
    description:
      "For storage and media platforms: become the storage developers reach for first.",
    perks: [
      "Logo on the home page",
      "Your adapter or guide featured as a recommended storage option in the docs",
      "Logo in the docs sidebar and the README",
      "A launch post about the partnership",
    ],
    featured: true,
  },
  {
    id: "silver",
    name: "Silver",
    price: 149,
    description:
      "Visibility on every docs page developers read while building.",
    perks: ["Logo in the docs sidebar", "Logo in the README and the footer"],
  },
  {
    id: "bronze",
    name: "Bronze",
    price: 69,
    description: "Your logo where developers discover UploadCN.",
    perks: ["Logo in the README", "Logo in the site footer"],
  },
  {
    id: "supporter",
    name: "Supporter",
    price: 15,
    description: "For teams and developers who ship with UploadCN.",
    perks: ["Your name in the README and on this page"],
  },
  {
    id: "backer",
    name: "Backer",
    price: 5,
    description: "Keep the project moving.",
    perks: ["Our thanks, and a better upload kit every month"],
  },
]

/** Sponsors whose logo shows in a placement. */
export function sponsorsFor(placement: "home" | "sidebar" | "footer") {
  const tiersFor: Record<typeof placement, SponsorTier[]> = {
    home: ["partner"],
    sidebar: ["partner", "silver"],
    footer: ["partner", "silver", "bronze"],
  }
  return sponsors.filter(
    (sponsor) => sponsor.logo && tiersFor[placement].includes(sponsor.tier)
  )
}
