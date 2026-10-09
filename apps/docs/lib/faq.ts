/**
 * Questions people (and answer engines) ask about UploadCN. Shown on the
 * home page and published as FAQPage structured data, so both stay in sync.
 */
export const faq = [
  {
    question: "What is UploadCN?",
    answer:
      "UploadCN is an open-source file upload kit for shadcn/ui. It ships upload components and blocks through a shadcn registry, so the UI is copied into your project, plus three small npm packages (@uploadcn/core, @uploadcn/react and @uploadcn/server) for the upload engine, React hooks and server routes.",
  },
  {
    question: "How do I add a file upload component to a shadcn project?",
    answer:
      "Run npx shadcn@latest add @uploadcn/file-upload in a project set up with shadcn/ui. The CLI copies the component into components/ and installs its dependencies. Every block has its own install command on its docs page and on the examples page.",
  },
  {
    question: "Which storage does UploadCN work with?",
    answer:
      "Any storage. Amazon S3, Cloudflare R2, MinIO, Backblaze B2 and other S3-compatible buckets use presigned URLs, so files go straight from the browser to the bucket. Cloudinary, local disk, tus servers, your own endpoint or any SDK (Supabase, Firebase, Vercel Blob) work through adapters, and localAdapter keeps files in the browser for forms.",
  },
  {
    question: "Does it support large, resumable and chunked uploads?",
    answer:
      "Yes. Large files upload in parallel multipart chunks that resume after a pause, a dropped connection or a page reload. Retries use exponential backoff, and uploads wait for the network to come back when the user goes offline.",
  },
  {
    question: "Does UploadCN work with every shadcn style and icon library?",
    answer:
      "Yes. Components follow all eight shadcn styles (Vega, Nova, Maia, Lyra, Mira, Luma, Sera and Rhea), the Radix, Base UI and React Aria bases, every theme, and the Lucide, Tabler, Hugeicons, Phosphor and Remix Icon libraries.",
  },
  {
    question: "Can uploads be scanned for viruses?",
    answer:
      "Yes, on your server. The upload route can scan every file with ClamAV, VirusTotal or your own scanner before the upload completes. Infected files are deleted and shown to the user as rejected.",
  },
  {
    question: "Can UploadCN read text from images and PDFs (OCR)?",
    answer:
      "Yes. OCR works with Google Cloud Vision, AWS Textract, Azure Document Intelligence, Mistral OCR or your own service through a server route, or with Tesseract directly in the browser. The OCR Upload and Receipt Upload blocks use it.",
  },
  {
    question: "Is UploadCN free?",
    answer:
      "Yes. UploadCN is open source under the MIT license. You own the component code you install, and the npm packages are free to use in commercial projects.",
  },
]
