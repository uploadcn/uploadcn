export const siteConfig = {
  name: "UploadCN",
  tagline: "Production-ready file uploads, built for shadcn.",
  description:
    "Composable upload primitives, hooks and complete upload experiences for shadcn/ui, with queues, retries, chunked and resumable uploads, presigned S3/R2 and accessible UI.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://uploadcn.dev",
  links: {
    github: "https://github.com/uploadcn/uploadcn",
    npm: "https://www.npmjs.com/org/uploadcn",
    directory: "https://ui.shadcn.com/docs/directory",
  },
  /**
   * Where "Become a sponsor" goes. Point it at the Open Collective page once
   * it exists; until then sponsors reach the maker directly.
   */
  sponsorUrl: "https://hanzala.me/#contact",
  repo: "uploadcn/uploadcn",
  namespace: "@uploadcn",
  author: {
    name: "Hanzala",
    url: "https://hanzala.me",
    github: "https://github.com/hanzala267",
    handle: "hanzala267",
  },
}
