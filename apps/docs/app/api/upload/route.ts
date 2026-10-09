import { getDemo } from "@/lib/demo-storage"

/**
 * The upload route used by every docs example. It is a real
 * `createUploadRoute`: backed by S3/R2 when credentials are configured,
 * and by in-memory storage otherwise.
 */
export function POST(request: Request) {
  return getDemo().route.POST(request)
}
