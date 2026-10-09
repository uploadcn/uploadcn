import {
  awsTextractOcr,
  azureDocumentIntelligenceOcr,
  createOcrRoute,
  googleVisionOcr,
  httpOcr,
  mistralOcr,
  type OcrProvider,
} from "@uploadcn/server/ocr"

/**
 * Reads text from images and PDFs at /api/ocr, for `ocrEndpoint("/api/ocr")`.
 * Set the variables for one provider; the first one found is used.
 */
function provider(): OcrProvider {
  if (process.env.GOOGLE_VISION_API_KEY) {
    return googleVisionOcr({ apiKey: process.env.GOOGLE_VISION_API_KEY })
  }
  if (process.env.TEXTRACT_REGION) {
    return awsTextractOcr({
      region: process.env.TEXTRACT_REGION,
      accessKeyId: process.env.TEXTRACT_ACCESS_KEY_ID!,
      secretAccessKey: process.env.TEXTRACT_SECRET_ACCESS_KEY!,
      // "expense" also returns merchant, date and total for receipts.
      model: process.env.TEXTRACT_MODEL === "expense" ? "expense" : "text",
    })
  }
  if (process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) {
    return azureDocumentIntelligenceOcr({
      endpoint: process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
      apiKey: process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY!,
      model: process.env.AZURE_DOCUMENT_INTELLIGENCE_MODEL || "prebuilt-read",
    })
  }
  if (process.env.MISTRAL_API_KEY) {
    return mistralOcr({ apiKey: process.env.MISTRAL_API_KEY })
  }
  if (process.env.OCR_SERVICE_URL) {
    // Your own service (PaddleOCR, docTR, Tesseract…) that returns OcrResult JSON.
    return httpOcr({
      url: process.env.OCR_SERVICE_URL,
      headers: process.env.OCR_SERVICE_TOKEN
        ? { authorization: `Bearer ${process.env.OCR_SERVICE_TOKEN}` }
        : undefined,
    })
  }
  throw new Error(
    "Set GOOGLE_VISION_API_KEY, TEXTRACT_REGION, AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT, MISTRAL_API_KEY or OCR_SERVICE_URL"
  )
}

// Created on the first request, so a missing variable doesn't fail the build.
let route: ReturnType<typeof createOcrRoute> | undefined

export function POST(request: Request) {
  route ??= createRoute()
  return route.POST(request)
}

const createRoute = () =>
  createOcrRoute({
    provider: provider(),
    maxFileSize: 20 * 1024 * 1024,
    async authorize() {
      // OCR costs money per page: authenticate and rate-limit here, and throw
      // `OcrRouteError` to deny.
      // const session = await auth()
      // if (!session) throw new OcrRouteError("Unauthorized", 401)
      // return { userId: session.user.id }
    },
    async onResult({ result }) {
      // Save the text, index it for search, or extract fields…
      return result
    },
  })
